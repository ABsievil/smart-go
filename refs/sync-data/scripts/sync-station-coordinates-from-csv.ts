import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';

type CsvRecord = Record<string, string>;

interface CsvCoordinate {
    stationCode: string;
    latitude: number;
    longitude: number;
}

const DEFAULT_CSV_PATH = path.join(
    process.cwd(),
    'refs',
    'geocoded-stations-missing-coordinates-opencage.csv',
);

/**
 * Đọc CSV và tự động phát hiện cột code/lat/lon.
 * Lưu ý: một số file CSV có BOM (UTF-8 BOM) làm hỏng header => cần normalize.
 */
function readCsvCoordinates(csvPath: string): Map<string, CsvCoordinate> {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found at: ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as CsvRecord[];

    const headerSample = records[0] || {};

    // Normalize header: trim + strip BOM + lowercase
    const normalize = (h: string) =>
        h
            .replace(/^\uFEFF/, '')
            .trim()
            .toLowerCase();
    const rawHeaders = Object.keys(headerSample);
    const normalizedHeaderMap = new Map(
        rawHeaders.map((h) => [normalize(h), h]),
    );

    const findHeader = (candidates: string[], fallback: string) => {
        for (const c of candidates) {
            const original = normalizedHeaderMap.get(c);
            if (original) return original;
        }
        return fallback;
    };

    const latHeader = findHeader(['lat', 'latitude'], 'latitude');
    const lonHeader = findHeader(['lon', 'lng', 'longitude'], 'longitude');
    const codeHeader = findHeader(
        ['stop_code', 'station_code', 'stationcode'],
        'stop_code',
    );

    const map = new Map<string, CsvCoordinate>();

    for (const rec of records) {
        // Normalize record keys to be robust to casing differences
        const normalizedRec = Object.fromEntries(
            Object.entries(rec).map(([k, v]) => [normalize(k), v]),
        );

        const stationCode = (
            (rec[codeHeader] ?? normalizedRec[normalize(codeHeader)]) ||
            ''
        ).trim();
        if (!stationCode) continue;

        const latRaw = rec[latHeader] ?? normalizedRec[normalize(latHeader)];
        const lonRaw = rec[lonHeader] ?? normalizedRec[normalize(lonHeader)];
        const lat =
            latRaw !== undefined && latRaw !== '' ? Number(latRaw) : NaN;
        const lon =
            lonRaw !== undefined && lonRaw !== '' ? Number(lonRaw) : NaN;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        map.set(stationCode, { stationCode, latitude: lat, longitude: lon });
    }

    return map;
}

async function syncStationCoordinatesFromCsv(): Promise<void> {
    const csvPath = process.env.CSV_PATH || DEFAULT_CSV_PATH;
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);
        const coordinatesByCode = readCsvCoordinates(csvPath);

        // eslint-disable-next-line no-console
        console.log(
            `Loaded ${coordinatesByCode.size} station coordinates from CSV: ${csvPath}`,
        );

        // Fetch only stations missing coordinates
        const stations = await stationRepository.find<StationEntity>(
            {
                $or: [
                    { 'coordinates.latitude': { $exists: false } },
                    { 'coordinates.longitude': { $exists: false } },
                    { 'coordinates.latitude': null },
                    { 'coordinates.longitude': null },
                ],
            },
            { lean: true },
        );

        let total = 0;
        let updated = 0;
        let skippedNoCsv = 0;
        let skippedHasCoords = 0;
        let invalid = 0;

        for (const station of stations) {
            total += 1;

            // Double-check skip if coords exist
            if (
                station.coordinates?.latitude !== undefined &&
                station.coordinates?.longitude !== undefined
            ) {
                skippedHasCoords += 1;
                continue;
            }

            const entry = coordinatesByCode.get(station.stationCode);
            if (!entry) {
                skippedNoCsv += 1;
                continue;
            }

            if (
                !Number.isFinite(entry.latitude) ||
                !Number.isFinite(entry.longitude)
            ) {
                invalid += 1;
                continue;
            }

            const updateData: Partial<StationEntity> = {
                coordinates: {
                    latitude: entry.latitude,
                    longitude: entry.longitude,
                },
            };

            await stationRepository.update(
                { stationCode: station.stationCode },
                updateData,
            );

            updated += 1;
            // eslint-disable-next-line no-console
            console.log(
                `✓ Synced coords for ${station.stationCode}: ${entry.latitude}, ${entry.longitude}`,
            );
        }

        // eslint-disable-next-line no-console
        console.log('\nSync completed:');
        // eslint-disable-next-line no-console
        console.log(`  Total candidates:        ${total}`);
        // eslint-disable-next-line no-console
        console.log(`  Updated:                 ${updated}`);
        // eslint-disable-next-line no-console
        console.log(`  Skipped (has coords):    ${skippedHasCoords}`);
        // eslint-disable-next-line no-console
        console.log(`  Skipped (no CSV entry):  ${skippedNoCsv}`);
        // eslint-disable-next-line no-console
        console.log(`  Invalid CSV rows:        ${invalid}`);
    } finally {
        await app.close();
    }
}

syncStationCoordinatesFromCsv().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Sync station coordinates from CSV failed:', err);
    process.exit(1);
});
