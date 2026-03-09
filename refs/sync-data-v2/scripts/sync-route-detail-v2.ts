import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { RouteRepository } from '@modules/routes/repositories/repository/route.repository';
import { RouteDoc } from '@modules/routes/repositories/entities/route.entity';
import { TransportType } from '@modules/routes/enums/route.enum';

interface CsvRow extends Array<string> {}

/**
 * Columns: csv_code, routeName, operator, transportType, totalDistance,
 *          vehicleType, operatingTime, baseFare, numTrips, tripTime, frequency
 */
interface RouteDetailRow {
    csvCode: string;
    operator: string;
    transportType: string;
    totalDistance: string;
    vehicleType: string;
    operatingTime: string;
    baseFare: string;
    numTrips: string;
    tripTime: string;
    frequency: string;
}

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
}

function parseDistanceKm(value: string | undefined): number {
    if (!value) return 0;
    const numPart = value.replace(/[^\d,.\-]/g, '').replace(',', '.');
    const parsed = parseFloat(numPart);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * "05:00 - 20:15" → { start: "05:00", end: "20:15" }
 */
function parseOperatingTime(value: string | undefined): {
    start: string | undefined;
    end: string | undefined;
} {
    if (!value) return { start: undefined, end: undefined };
    const parts = value.split('-').map((p) => p.trim());
    return {
        start: parts[0] || undefined,
        end: parts[1] || undefined,
    };
}

/**
 * "- Vé lượt trợ giá: 5,000 VNĐ - Vé tập: 112,500 VNĐ"
 * → ["Vé lượt trợ giá: 5,000 VNĐ", "Vé tập: 112,500 VNĐ"]
 */
function parseBaseFare(value: string | undefined): string[] {
    if (!value) return [];
    const cleaned = normalizeWhitespace(value);
    if (!cleaned) return [];

    const fares = cleaned
        .split('-')
        .map((f) => normalizeWhitespace(f))
        .filter(Boolean);

    return fares;
}

/**
 * Parse operator field với các pattern:
 *   "Công ty TNHH..., ĐT: 028.3776.3777"  → { operatorName, phoneNumber }
 *   "Đt: (08) 38.441.224"                  → { phoneNumber only }
 *   "(08) 38.441.224"                       → { phoneNumber only }
 *   "Hợp tác xã 19/5"                      → { operatorName only }
 */
function parseOperator(value: string | undefined): {
    operatorName: string | undefined;
    phoneNumber: string | undefined;
} {
    if (!value) return { operatorName: undefined, phoneNumber: undefined };

    const cleaned = normalizeWhitespace(value);
    if (!cleaned) return { operatorName: undefined, phoneNumber: undefined };

    // Case 1: Contains "ĐT:" / "Đt:" → split into operatorName + phoneNumber
    // Include () in phone capture group for patterns like (028)38.642.712
    const dtPattern = /ĐT\s*:\s*([\d.\-\s\(\)]+)/i;
    const dtMatch = cleaned.match(dtPattern);

    if (dtMatch && dtMatch[1]) {
        const phoneNumber = normalizeWhitespace(dtMatch[1]);
        const operatorName = cleaned
            .substring(0, dtMatch.index)
            .replace(/,\s*$/, '')
            .trim();
        return {
            operatorName: operatorName || undefined,
            phoneNumber: phoneNumber || undefined,
        };
    }

    // Case 2: Phone-number-only — only digits, spaces, dots, dashes, parentheses
    // e.g. "(08) 38.441.224", "18001557"
    const phoneOnlyPattern = /^[\d\s.\-\(\)]+$/;
    if (phoneOnlyPattern.test(cleaned)) {
        return { operatorName: undefined, phoneNumber: cleaned };
    }

    // Case 3: Name only
    return { operatorName: cleaned, phoneNumber: undefined };
}

function mapTransportType(value: string | undefined): TransportType {
    if (!value) return TransportType.PHO_THONG_CO_TRO_GIA;

    const cleaned = normalizeWhitespace(value);

    if (cleaned === TransportType.PHO_THONG_CO_TRO_GIA)
        return TransportType.PHO_THONG_CO_TRO_GIA;
    if (cleaned === TransportType.PHO_THONG_KHONG_TRO_GIA)
        return TransportType.PHO_THONG_KHONG_TRO_GIA;
    if (cleaned === TransportType.KHONG_TRO_GIA_DU_LICH)
        return TransportType.KHONG_TRO_GIA_DU_LICH;
    if (cleaned === TransportType.HOC_SINH_CO_TRO_GIA)
        return TransportType.HOC_SINH_CO_TRO_GIA;

    const lower = cleaned.toLowerCase();
    if (lower.includes('không trợ giá') && lower.includes('du lịch'))
        return TransportType.KHONG_TRO_GIA_DU_LICH;
    if (lower.includes('học sinh')) return TransportType.HOC_SINH_CO_TRO_GIA;
    if (lower.includes('không trợ giá'))
        return TransportType.PHO_THONG_KHONG_TRO_GIA;

    return TransportType.PHO_THONG_CO_TRO_GIA;
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

async function loadDetailRows(csvPath: string): Promise<RouteDetailRow[]> {
    const rows = await readCsvFile(csvPath);
    // Skip header row
    return rows.slice(1).map((row) => ({
        csvCode: normalizeWhitespace(row[0]),
        operator: normalizeWhitespace(row[2]),
        transportType: normalizeWhitespace(row[3]),
        totalDistance: normalizeWhitespace(row[4]),
        vehicleType: normalizeWhitespace(row[5]),
        operatingTime: normalizeWhitespace(row[6]),
        baseFare: normalizeWhitespace(row[7]),
        numTrips: normalizeWhitespace(row[8]),
        tripTime: normalizeWhitespace(row[9]),
        frequency: normalizeWhitespace(row[10]),
    }));
}

async function syncRouteDetails(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const routeRepository = app.get<RouteRepository>(RouteRepository);

        const csvPath = path.join(
            process.cwd(),
            'refs',
            'sync-data-v2',
            'data-9-3-26',
            'Route_detail.csv',
        );

        // eslint-disable-next-line no-console
        console.log(`Starting route detail sync v2 from: ${csvPath}`);

        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found: ${csvPath}`);
        }

        const detailRows = await loadDetailRows(csvPath);

        // eslint-disable-next-line no-console
        console.log(`Total detail rows to process: ${detailRows.length}`);

        let successCount = 0;
        let errorCount = 0;

        for (const row of detailRows) {
            if (!row.csvCode) continue;

            // csv_code maps directly to routeCode in DB
            const routeCode = row.csvCode;

            try {
                const { operatorName, phoneNumber } = parseOperator(
                    row.operator,
                );
                const transportType = mapTransportType(row.transportType);
                const totalDistance = parseDistanceKm(row.totalDistance);
                const baseFare = parseBaseFare(row.baseFare);
                const { start: operatingTimeStart, end: operatingTimeEnd } =
                    parseOperatingTime(row.operatingTime);

                const detailData = {
                    operatorName,
                    phoneNumber,
                    transportType,
                    totalDistance,
                    vehicleType: row.vehicleType || undefined,
                    operatingTimeStart,
                    operatingTimeEnd,
                    baseFare,
                    numTrips: row.numTrips || undefined,
                    tripTime: row.tripTime || undefined,
                    frequency: row.frequency || undefined,
                };

                // Tìm tất cả records cùng routeCode (cả forward lẫn backward)
                const existing = await routeRepository.find(
                    { routeCode },
                    { lean: true },
                );

                if (existing.length > 0) {
                    // Update từng record theo _id (tránh limit: 1 của update mặc định)
                    for (const record of existing) {
                        await routeRepository.update<RouteDoc>(
                            { _id: (record as any)._id },
                            detailData,
                        );
                        successCount += 1;
                    }
                } else {
                    // eslint-disable-next-line no-console
                    console.warn(
                        `Route not found in DB, skipping: routeCode="${routeCode}"`,
                    );
                }
            } catch (err) {
                errorCount += 1;
                // eslint-disable-next-line no-console
                console.error(
                    `Failed to update route routeCode="${routeCode}":`,
                    err,
                );
            }

            if (successCount > 0 && successCount % 50 === 0) {
                // eslint-disable-next-line no-console
                console.log(`Updated ${successCount} records so far...`);
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `Route detail sync v2 completed. Success: ${successCount}, Errors: ${errorCount}`,
        );
    } finally {
        await app.close();
    }
}

syncRouteDetails().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Route detail sync v2 failed:', err);
    process.exit(1);
});
