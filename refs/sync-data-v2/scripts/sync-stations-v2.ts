import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import {
    StationEntity,
    StationDoc,
} from '@modules/stations/repositories/entities/station.entity';
import {
    StationType,
    StationStatus,
} from '@modules/stations/enums/station.enum';
import { RouteRepository } from '@modules/routes/repositories/repository/route.repository';
import { RouteDoc } from '@modules/routes/repositories/entities/route.entity';

interface CsvRow extends Array<string> {}

/**
 * Columns: RouteKey, VariantNumber, stationCode, stationName, condition,
 *          stopCategory, streetName, AddressNo, hasRamp, hasWheelChair, Lat, Lng
 */
interface StationRow {
    routeKey: string;
    variantNumber: string;
    stationCode: string;
    stationName: string;
    condition: string;
    stopCategory: string;
    streetName: string;
    addressNo: string;
    hasRamp: boolean;
    hasWheelchair: boolean;
    latitude: number;
    longitude: number;
}

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
}

function parseYesNo(value: string | undefined): boolean {
    return normalizeWhitespace(value).toUpperCase() === 'YES';
}

async function readCsvFile(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const records: CsvRow[] = [];

        const stream = fs.createReadStream(filePath).pipe(
            parse({
                columns: false,
                skip_empty_lines: true,
                relax_column_count: true,
            }),
        );

        stream.on('readable', () => {
            let record: CsvRow;
            // eslint-disable-next-line no-cond-assign
            while ((record = stream.read() as CsvRow)) {
                records.push(record);
            }
        });

        stream.on('error', (err: Error) => reject(err));
        stream.on('end', () => resolve(records));
    });
}

async function loadStationRows(csvPath: string): Promise<StationRow[]> {
    const rows = await readCsvFile(csvPath);
    // Skip header row
    return rows.slice(1).map((row) => ({
        routeKey: normalizeWhitespace(row[0]),
        variantNumber: normalizeWhitespace(row[1]),
        stationCode: normalizeWhitespace(row[2]),
        stationName: normalizeWhitespace(row[3]),
        condition: normalizeWhitespace(row[4]),
        stopCategory: normalizeWhitespace(row[5]),
        streetName: normalizeWhitespace(row[6]),
        addressNo: normalizeWhitespace(row[7]),
        hasRamp: parseYesNo(row[8]),
        hasWheelchair: parseYesNo(row[9]),
        latitude: parseFloat(row[10]) || 0,
        longitude: parseFloat(row[11]) || 0,
    }));
}

/**
 * Xây dựng map: routeKey → [outboundVariantStationCodes, inboundVariantStationCodes?]
 *
 * VariantNumber xuất hiện trước cho mỗi RouteKey là chiều đi (outbound),
 * VariantNumber xuất hiện sau là chiều về (inbound).
 * Thứ tự station trong mỗi mảng giữ nguyên theo thứ tự CSV.
 */
function buildRouteVariantMap(
    rows: StationRow[],
): Map<string, { outbound: string[]; inbound: string[] | null }> {
    // routeKey → ordered list of { variantNumber, stationCodes[] }
    const variantOrderMap = new Map<
        string,
        Array<{ variantNumber: string; stationCodes: string[] }>
    >();

    for (const row of rows) {
        if (!row.routeKey || !row.stationCode) continue;

        let variants = variantOrderMap.get(row.routeKey);
        if (!variants) {
            variants = [];
            variantOrderMap.set(row.routeKey, variants);
        }

        let variant = variants.find(
            (v) => v.variantNumber === row.variantNumber,
        );
        if (!variant) {
            variant = { variantNumber: row.variantNumber, stationCodes: [] };
            variants.push(variant);
        }

        variant.stationCodes.push(row.stationCode);
    }

    // Convert to outbound / inbound
    const result = new Map<
        string,
        { outbound: string[]; inbound: string[] | null }
    >();

    for (const [routeKey, variants] of variantOrderMap.entries()) {
        result.set(routeKey, {
            outbound: variants[0]?.stationCodes ?? [],
            inbound: variants[1]?.stationCodes ?? null,
        });
    }

    return result;
}

async function syncStations(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);
        const routeRepository = app.get<RouteRepository>(RouteRepository);

        const csvPath = path.join(
            process.cwd(),
            'refs',
            'sync-data-v2',
            'data-9-3-26',
            'station_data_3.csv',
        );

        // eslint-disable-next-line no-console
        console.log(`Starting station sync v2 from: ${csvPath}`);

        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found: ${csvPath}`);
        }

        const stationRows = await loadStationRows(csvPath);

        // eslint-disable-next-line no-console
        console.log(`Total station rows to process: ${stationRows.length}`);

        // ── Phase 1: Upsert stations (deduplicated by stationCode) ─────────────

        const seenStationCodes = new Set<string>();
        let stationSuccessCount = 0;
        let stationErrorCount = 0;

        for (const row of stationRows) {
            if (!row.stationCode || seenStationCodes.has(row.stationCode)) {
                continue;
            }
            seenStationCodes.add(row.stationCode);

            try {
                const stationData: Partial<StationEntity> = {
                    stationCode: row.stationCode,
                    stationName: row.stationName,
                    latitude: row.latitude,
                    longitude: row.longitude,
                    condition: row.condition || undefined,
                    stopCategory: row.stopCategory || undefined,
                    streetName: row.streetName || undefined,
                    addressNo: row.addressNo || undefined,
                    hasRamp: row.hasRamp,
                    hasWheelchair: row.hasWheelchair,
                    stationType: StationType.BUS_STOP,
                    status: StationStatus.ACTIVE,
                };

                const existing = await stationRepository.find<StationEntity>(
                    { stationCode: row.stationCode },
                    { lean: true },
                );

                if (existing.length > 0) {
                    await stationRepository.update<StationDoc>(
                        { stationCode: row.stationCode },
                        stationData,
                    );
                } else {
                    await stationRepository.create<StationEntity>(stationData);
                }

                stationSuccessCount += 1;

                if ((stationSuccessCount + stationErrorCount) % 200 === 0) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `[Stations] Processed ${stationSuccessCount + stationErrorCount}/${seenStationCodes.size} unique stations...`,
                    );
                }
            } catch (err) {
                stationErrorCount += 1;
                // eslint-disable-next-line no-console
                console.error(
                    `Failed to sync station "${row.stationCode}":`,
                    err,
                );
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `[Stations] Sync completed. Success: ${stationSuccessCount}, Errors: ${stationErrorCount}`,
        );

        // ── Phase 2: Build stationCode → _id lookup map ────────────────────────

        // eslint-disable-next-line no-console
        console.log('Building stationCode → _id lookup map...');

        const allStations = await stationRepository.find<StationEntity>(
            {},
            { lean: true },
        );

        const stationIdMap = new Map<string, string>();
        for (const station of allStations) {
            const id = (station as any)._id?.toString();
            const code = (station as StationEntity).stationCode;
            if (id && code) {
                stationIdMap.set(code, id);
            }
        }

        // eslint-disable-next-line no-console
        console.log(`Loaded ${stationIdMap.size} stations into lookup map.`);

        // ── Phase 3: Update routes with ordered stationIds ─────────────────────

        const routeVariantMap = buildRouteVariantMap(stationRows);

        // eslint-disable-next-line no-console
        console.log(
            `Updating stationIds for ${routeVariantMap.size} routes...`,
        );

        let routeSuccessCount = 0;
        let routeErrorCount = 0;

        for (const [
            routeKey,
            { outbound, inbound },
        ] of routeVariantMap.entries()) {
            // Update outbound route
            try {
                const outboundIds = outbound
                    .map((code) => stationIdMap.get(code))
                    .filter((id): id is string => Boolean(id));

                const outboundRoutes = await routeRepository.find<RouteDoc>(
                    { routeKey, isOutbound: true },
                    { lean: true },
                );

                if (outboundRoutes.length > 0) {
                    await routeRepository.update<RouteDoc>(
                        { _id: (outboundRoutes[0] as any)._id },
                        { stationIds: outboundIds },
                    );
                    routeSuccessCount += 1;
                } else {
                    // eslint-disable-next-line no-console
                    console.warn(
                        `Outbound route not found in DB, skipping: routeKey="${routeKey}"`,
                    );
                }
            } catch (err) {
                routeErrorCount += 1;
                // eslint-disable-next-line no-console
                console.error(
                    `Failed to update outbound stationIds for routeKey="${routeKey}":`,
                    err,
                );
            }

            // Update inbound route (if exists)
            if (inbound !== null) {
                try {
                    const inboundIds = inbound
                        .map((code) => stationIdMap.get(code))
                        .filter((id): id is string => Boolean(id));

                    const inboundRoutes = await routeRepository.find<RouteDoc>(
                        { routeKey, isOutbound: false },
                        { lean: true },
                    );

                    if (inboundRoutes.length > 0) {
                        await routeRepository.update<RouteDoc>(
                            { _id: (inboundRoutes[0] as any)._id },
                            { stationIds: inboundIds },
                        );
                        routeSuccessCount += 1;
                    } else {
                        // eslint-disable-next-line no-console
                        console.warn(
                            `Inbound route not found in DB, skipping: routeKey="${routeKey}"`,
                        );
                    }
                } catch (err) {
                    routeErrorCount += 1;
                    // eslint-disable-next-line no-console
                    console.error(
                        `Failed to update inbound stationIds for routeKey="${routeKey}":`,
                        err,
                    );
                }
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `[Routes] stationIds update completed. Success: ${routeSuccessCount}, Errors: ${routeErrorCount}`,
        );
    } finally {
        await app.close();
    }
}

syncStations().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Station sync v2 failed:', err);
    process.exit(1);
});
