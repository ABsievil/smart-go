import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';

interface RefStation {
    name: string;
    ref?: string;
    latitude: number;
    longitude: number;
    normFull: string;
    normNoComma: string;
    tokenKey: string;
}

const PREFIXES = [
    'tram xe buyt',
    'bến xe buýt',
    'ben xe buyt',
    'điểm dừng',
    'diem dung',
    'điểm đón',
    'diem don',
];

const DIGIT_MAP: Record<string, string> = {
    '0': '0',
    khong: '0',
    mot: '1',
    một: '1',
    '1': '1',
    hai: '2',
    '2': '2',
    ba: '3',
    '3': '3',
    bon: '4',
    bốn: '4',
    tu: '4',
    tư: '4',
    '4': '4',
    nam: '5',
    năm: '5',
    '5': '5',
    sau: '6',
    sáu: '6',
    '6': '6',
    bay: '7',
    bảy: '7',
    '7': '7',
    tam: '8',
    tám: '8',
    '8': '8',
    chin: '9',
    chín: '9',
    '9': '9',
};

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
}

function stripAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function simplifyName(raw: string | undefined): {
    normFull: string;
    normNoComma: string;
    tokenKey: string;
} {
    if (!raw) {
        return { normFull: '', normNoComma: '', tokenKey: '' };
    }

    // Lowercase + accent-insensitive
    let s = stripAccents(normalizeWhitespace(raw).toLowerCase());

    // Remove content inside brackets [] and () because chúng thường chứa mã trạm
    s = s.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');

    // Remove common prefixes
    for (const prefix of PREFIXES) {
        if (s.startsWith(prefix + ' ')) {
            s = s.slice(prefix.length).trim();
            break;
        }
    }

    // Replace punctuation with space
    s = s.replace(/[,.\-;:/]/g, ' ');

    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();

    const normFull = s;
    const normNoComma = s.split(',')[0]?.trim() || normFull;

    // Token key (bag-of-words sorted)
    const tokens = normFull
        .split(' ')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => DIGIT_MAP[t] ?? t); // unify số viết chữ/số

    const normalizedFullWithDigits = tokens.join(' ');
    const normalizedNoCommaWithDigits =
        normalizedFullWithDigits.split(',')[0]?.trim() ||
        normalizedFullWithDigits;

    const normFullFinal = normalizedFullWithDigits;
    const normNoCommaFinal = normalizedNoCommaWithDigits;

    const tokenKey = [...tokens].sort().join(' ');

    return { normFull: normFullFinal, normNoComma: normNoCommaFinal, tokenKey };
}

function loadRefStations(): RefStation[] {
    const filePath = path.join(process.cwd(), 'refs', 'station.json');
    if (!fs.existsSync(filePath)) {
        throw new Error(`station.json not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as {
        features?: Array<{
            properties?: Record<string, unknown>;
            geometry?: { type?: string; coordinates?: number[] };
        }>;
    };

    if (!parsed.features || !Array.isArray(parsed.features)) {
        throw new Error('Invalid station.json format: missing features array');
    }

    const refs: RefStation[] = [];

    for (const feature of parsed.features) {
        const props = feature.properties || {};
        const geometry = feature.geometry;

        const name =
            typeof props['name'] === 'string'
                ? (props['name'] as string)
                : undefined;
        const ref =
            typeof props['ref'] === 'string'
                ? (props['ref'] as string)
                : undefined;

        if (
            !geometry ||
            geometry.type !== 'Point' ||
            !Array.isArray(geometry.coordinates) ||
            geometry.coordinates.length < 2
        ) {
            continue;
        }

        const [lon, lat] = geometry.coordinates;
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            continue;
        }

        if (!name) {
            continue;
        }

        const { normFull, normNoComma, tokenKey } = simplifyName(name);

        refs.push({
            name,
            ref,
            latitude: lat,
            longitude: lon,
            normFull,
            normNoComma,
            tokenKey,
        });
    }

    return refs;
}

function buildNameMap(refs: RefStation[]): Map<string, RefStation[]> {
    const map = new Map<string, RefStation[]>();

    const add = (key: string, ref: RefStation) => {
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(ref);
    };

    for (const ref of refs) {
        add(ref.normFull, ref);
        add(ref.normNoComma, ref);
    }

    return map;
}

function assignRandomRef(refs: RefStation[]): void {
    for (const item of refs) {
        if (!item.ref) {
            item.ref = randomUUID().slice(0, 8);
        }
    }
}

function filterByRef(
    candidates: RefStation[],
    stationCode: string,
): RefStation[] {
    if (!candidates.length) return candidates;
    const normCode = simplifyName(stationCode).normFull;
    const matched = candidates.filter(
        (c) => c.ref && simplifyName(c.ref).normFull === normCode,
    );
    return matched.length ? matched : candidates;
}

function findRefStation(
    stationName: string,
    stationCode: string,
    nameMap: Map<string, RefStation[]>,
    refs: RefStation[],
): RefStation | undefined {
    const { normFull, normNoComma, tokenKey } = simplifyName(stationName);
    if (!normFull) return undefined;

    const tried = new Set<string>();

    const tryKey = (key: string): RefStation[] => {
        if (!key || tried.has(key)) return [];
        tried.add(key);
        return nameMap.get(key) || [];
    };

    // 1) Exact full
    let matches: RefStation[] = tryKey(normFull);

    // 2) Exact no-comma
    if (!matches.length) {
        matches = tryKey(normNoComma);
    }

    // 3) Substring: ref name is contained in station name
    if (!matches.length) {
        matches = refs.filter(
            (r) => r.normFull && normFull.includes(r.normFull),
        );
    }

    // 4) Bag-of-words subset: all ref tokens contained in station tokens
    if (!matches.length) {
        const stationTokens = new Set(normFull.split(' ').filter(Boolean));
        matches = refs.filter((r) => {
            if (!r.tokenKey) return false;
            const refTokens = r.tokenKey.split(' ').filter(Boolean);
            return refTokens.every((t) => stationTokens.has(t));
        });
    }

    if (!matches.length) return undefined;

    const resolved = filterByRef(matches, stationCode);
    if (resolved.length === 1) {
        return resolved[0];
    }

    // If still multiple, prefer the one with ref, else first
    const withRef = resolved.find((r) => !!r.ref);
    return withRef || resolved[0];
}

async function syncStationCoordinates(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);
        const refStations = loadRefStations();
        const nameMap = buildNameMap(refStations);

        const stations = await stationRepository.find<StationEntity>(
            {},
            { lean: true },
        );

        let matched = 0;
        let updated = 0;
        let notFound = 0;
        let skippedHasCoords = 0;

        for (const station of stations) {
            if (
                station.coordinates?.latitude &&
                station.coordinates?.longitude
            ) {
                skippedHasCoords += 1;
                continue;
            }

            const refStation = findRefStation(
                station.stationName,
                station.stationCode,
                nameMap,
                refStations,
            );

            if (!refStation) {
                notFound += 1;
                // eslint-disable-next-line no-console
                console.warn(
                    `No coordinate match for station "${station.stationName}" (${station.stationCode})`,
                );
                continue;
            }

            matched += 1;

            const updateData: Partial<StationEntity> = {
                coordinates: {
                    latitude: refStation.latitude,
                    longitude: refStation.longitude,
                },
            };

            const result = await stationRepository.update(
                { stationCode: station.stationCode },
                updateData,
            );

            if (result) {
                updated += 1;
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `Coordinate sync completed. Matched: ${matched}, Updated: ${updated}, Not found: ${notFound}, Skipped existing coords: ${skippedHasCoords}`,
        );
    } finally {
        await app.close();
    }
}

syncStationCoordinates().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Station coordinate sync failed:', err);
    process.exit(1);
});
