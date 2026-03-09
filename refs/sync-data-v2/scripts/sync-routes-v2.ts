import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { RouteRepository } from '@modules/routes/repositories/repository/route.repository';
import {
    RouteEntity,
    RouteDoc,
} from '@modules/routes/repositories/entities/route.entity';
import { RouteStatus, TransportType } from '@modules/routes/enums/route.enum';

interface CsvRow extends Array<string> {}

/**
 * Columns: Key, RouteNo, RouteName, RouteVarShortName, StartStop, EndStop, Outbound, RunningTime
 */
interface RouterRow {
    key: string;
    routeNo: string;
    routeName: string;
    routeVarShortName: string;
    startStop: string;
    endStop: string;
    outbound: boolean;
    runningTime: string;
}

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
}

/**
 * Chuẩn hóa routeName về format thống nhất: "Lượt đi: ..." / "Lượt về: ..."
 *
 * Các trường hợp xử lý:
 *   "lượt đi"                       → "Lượt đi: {startStop} - {endStop}"
 *   "lượt về"                       → "Lượt về: {startStop} - {endStop}"
 *   "lượt về Đầm Sen - Bến Phú Định"→ "Lượt về: Đầm Sen - Bến Phú Định"
 *   "lượt đi: KDL BCR - KCX Linh"  → "Lượt đi: KDL BCR - KCX Linh"
 *   "Lượt đi: Bến Thành - BX..."   → giữ nguyên (chỉ normalize whitespace)
 *   Tên không bắt đầu bằng "lượt"  → giữ nguyên
 */
function formatRouteName(
    rawName: string,
    startStop: string,
    endStop: string,
): string {
    const name = normalizeWhitespace(rawName);
    if (!name) return '';

    // Match "lượt đi" hoặc "lượt về" ở đầu chuỗi (case insensitive, kể cả có dấu ":" sau)
    const directionMatch = name.match(/^(lượt\s+(?:đi|về))\s*:?\s*/i);
    if (!directionMatch) {
        return name;
    }

    // Chuẩn hoá direction về dạng "Lượt đi" / "Lượt về"
    const directionKey = directionMatch[1]
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    const direction = directionKey === 'lượt đi' ? 'Lượt đi' : 'Lượt về';

    // Phần còn lại sau direction keyword (đã bỏ ":" nếu có)
    const rest = name.substring(directionMatch[0].length).trim();

    if (!rest) {
        // Không có tên → build từ startStop - endStop
        const stops = [startStop, endStop].filter(Boolean).join(' - ');
        return stops ? `${direction}: ${stops}` : direction;
    }

    return `${direction}: ${rest}`;
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

async function loadRouterRows(csvPath: string): Promise<RouterRow[]> {
    const rows = await readCsvFile(csvPath);
    // Skip header row
    return rows.slice(1).map((row) => ({
        key: normalizeWhitespace(row[0]),
        routeNo: normalizeWhitespace(row[1]),
        routeName: normalizeWhitespace(row[2]),
        routeVarShortName: normalizeWhitespace(row[3]),
        startStop: normalizeWhitespace(row[4]),
        endStop: normalizeWhitespace(row[5]),
        outbound: row[6]?.trim().toUpperCase() === 'TRUE',
        runningTime: normalizeWhitespace(row[7]),
    }));
}

async function syncRoutes(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const routeRepository = app.get<RouteRepository>(RouteRepository);

        const routersCsvPath = path.join(
            process.cwd(),
            'refs',
            'sync-data-v2',
            'data-9-3-26',
            'routers.csv',
        );

        // eslint-disable-next-line no-console
        console.log(`Starting route sync v2 from: ${routersCsvPath}`);

        if (!fs.existsSync(routersCsvPath)) {
            throw new Error(`CSV file not found: ${routersCsvPath}`);
        }

        const routerRows = await loadRouterRows(routersCsvPath);

        // eslint-disable-next-line no-console
        console.log(
            `Total route direction rows to process: ${routerRows.length}`,
        );

        let successCount = 0;
        let errorCount = 0;

        for (const row of routerRows) {
            if (!row.routeNo) {
                continue;
            }

            // routeCode = RouteNo (không unique), phân biệt 2 chiều bằng isOutbound
            const routeCode = row.routeNo;
            const isOutbound = row.outbound;

            try {
                const updateData: Partial<RouteEntity> = {
                    routeKey: row.key || undefined,
                    routeCode,
                    routeName: formatRouteName(
                        row.routeName,
                        row.startStop,
                        row.endStop,
                    ),
                    routeVarShortName: row.routeVarShortName || undefined,
                    startPoint: row.startStop || undefined,
                    endPoint: row.endStop || undefined,
                    isOutbound,
                    runningTime: row.runningTime || undefined,
                    status: RouteStatus.ACTIVE,
                };

                // Composite filter: routeCode + isOutbound để phân biệt 2 record cùng routeCode
                const filter = { routeCode, isOutbound };

                const existing = await routeRepository.find<RouteEntity>(
                    filter,
                    { lean: true },
                );

                if (existing.length > 0) {
                    await routeRepository.update<RouteDoc>(filter, updateData);
                } else {
                    // transportType is required by schema — set default on create
                    await routeRepository.create<RouteEntity>({
                        ...updateData,
                        transportType: TransportType.PHO_THONG_CO_TRO_GIA,
                    });
                }

                successCount += 1;

                if ((successCount + errorCount) % 50 === 0) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `Processed ${successCount + errorCount}/${routerRows.length} rows...`,
                    );
                }
            } catch (err) {
                errorCount += 1;
                // eslint-disable-next-line no-console
                console.error(
                    `Failed to sync route "${routeCode}" (RouteNo: ${row.routeNo}):`,
                    err,
                );
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `Route sync v2 completed. Success: ${successCount}, Errors: ${errorCount}`,
        );
    } finally {
        await app.close();
    }
}

syncRoutes().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Route sync v2 failed:', err);
    process.exit(1);
});
