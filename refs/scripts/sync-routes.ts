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
 * Chuẩn hóa mã tuyến về dạng không có số 0 ở đầu để đồng bộ
 * giữa dữ liệu checkpoint (có thể là "01") và file GTCC (thường là "1").
 */
function normalizeRouteCode(code: string | undefined | null): string {
    if (!code) return '';
    const trimmed = String(code).trim();
    // Bỏ các số 0 ở đầu, nhưng vẫn giữ "0" nếu toàn bộ là 0
    const noLeadingZeros = trimmed.replace(/^0+(\d+)/, '$1');
    return noLeadingZeros || trimmed;
}

function parseDistanceKm(value: string | undefined): number {
    if (!value) return 0;
    // Ví dụ: "8,59 km" -> 8.59
    const numPart = value.replace(/[^\d,.\-]/g, '').replace(',', '.');
    const parsed = parseFloat(numPart);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseTimeRange(value: string | undefined): {
    from: string;
    to: string;
} {
    if (!value) {
        return { from: '', to: '' };
    }

    // Ví dụ: "05:00 - 20:15"
    const parts = value.split('-').map((p) => p.trim());
    if (parts.length >= 2) {
        return { from: parts[0], to: parts[1] };
    }

    return { from: value.trim(), to: '' };
}

function parseFirstNumber(value: string | undefined): number {
    if (!value) return 0;
    const match = value.match(/(\d+([.,]\d+)?)/);
    if (!match) return 0;
    const num = match[1].replace(',', '.');
    const parsed = parseFloat(num);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumberRange(value: string | undefined): {
    from: number;
    to: number;
} {
    if (!value) return { from: 0, to: 0 };
    const matches = value.match(/(\d+([.,]\d+)?)/g);
    if (!matches || matches.length === 0) {
        return { from: 0, to: 0 };
    }

    const parseNum = (s: string): number => {
        const normalized = s.replace(',', '.');
        const n = parseFloat(normalized);
        return Number.isFinite(n) ? n : 0;
    };

    const from = parseNum(matches[0]);
    const to = matches[1] ? parseNum(matches[1]) : from;

    return { from, to };
}

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
}

function parsePaymentMethods(value: string | undefined): string[] {
    if (!value) return [];
    const cleaned = normalizeWhitespace(value);
    if (!cleaned) return [];

    // Các phương thức thanh toán phổ biến trong file GTCC
    const KNOWN_METHODS = [
        'Tiền mặt',
        'Thẻ ngân hàng',
        'Ví điện tử',
        'FutaPay',
    ];

    const methods: string[] = [];

    for (const method of KNOWN_METHODS) {
        if (cleaned.includes(method)) {
            methods.push(method);
        }
    }

    // Nếu không khớp phương thức nào trong danh sách trên,
    // fallback: trả về nguyên chuỗi như một phần tử.
    if (methods.length === 0) {
        methods.push(cleaned);
    }

    return methods;
}

function extractStartEndPoints(
    startRaw: string | undefined,
    endRaw: string | undefined,
): { startPoint: string; endPoint: string } {
    const startLines = (startRaw || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    const endLines = (endRaw || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    return {
        startPoint: startLines[0] || normalizeWhitespace(startRaw || ''),
        endPoint: endLines[0] || normalizeWhitespace(endRaw || ''),
    };
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

async function buildRouteStationMap(
    checkpointPath: string,
): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();

    if (!fs.existsSync(checkpointPath)) {
        return map;
    }

    const rows = await readCsvFile(checkpointPath);
    if (rows.length === 0) return map;

    // Bỏ header
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
        const [rawStopCode, _stopName, _address, rawRoutes] = row;
        const stopCode = String(rawStopCode || '').trim();
        if (!stopCode) continue;

        if (!rawRoutes) continue;

        const routeCodes = rawRoutes
            .split(',')
            .map((r) => normalizeRouteCode(r))
            .filter(Boolean);

        for (const routeCode of routeCodes) {
            const key = routeCode;
            const existing = map.get(key) ?? [];
            if (!existing.includes(stopCode)) {
                existing.push(stopCode);
            }
            map.set(key, existing);
        }
    }

    return map;
}

async function syncRoutes(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const routeRepository = app.get<RouteRepository>(RouteRepository);

        const csvPath = path.join(
            process.cwd(),
            'refs',
            'Dữ liệu GTCC TPHCM.cleaned.csv',
        );

        // eslint-disable-next-line no-console
        console.log(`Starting route sync from CSV: ${csvPath}`);

        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found at path: ${csvPath}`);
        }

        const rows = await readCsvFile(csvPath);

        if (rows.length === 0) {
            // Không có dữ liệu
            return;
        }

        // Bỏ dòng header đầu tiên
        const dataRows = rows.slice(1);

        // eslint-disable-next-line no-console
        console.log(`Total routes to process: ${dataRows.length}`);

        // Build map routeCode -> list of station codes from checkpoint file
        const checkpointPath = path.join(
            process.cwd(),
            'refs',
            'checkpoint_4500.csv',
        );
        const routeStationMap = await buildRouteStationMap(checkpointPath);

        let successCount = 0;
        let errorCount = 0;

        for (const row of dataRows) {
            const [
                rawRouteCode, // 0 - Số tuyến
                startRaw, // 1 - Tên tuyến (đầu bến)
                _arrow, // 2 - "↔"
                endRaw, // 3 - Tên tuyến (cuối bến)
                _stationsRaw, // 4 - Trạm (lộ trình chi tiết) - chưa mapping sang stationIds
                distanceRaw, // 5 - Cự ly
                operatingRaw, // 6 - Thời gian hoạt động (vd: "05:00 - 20:15")
                tripTimeRaw, // 7 - Thời gian chuyến (vd: "35 phút" hoặc "60 – 65 phút")
                frequencyEachTripRaw, // 8 - Tuần suất mỗi chuyến (vd: "15 – 18 phút")
                _vehicleTypeRaw, // 9 - Loại xe
                operatorRaw, // 10 - Đơn vị đảm nhiệm
                paymentRaw, // 11 - Hình thức thanh toán
                noteRaw, // 12 - Ghi chú
            ] = row;

            const routeCode = normalizeRouteCode(rawRouteCode);
            if (!routeCode) {
                // Bỏ qua dòng không có mã tuyến
                continue;
            }

            try {
                const { startPoint, endPoint } = extractStartEndPoints(
                    startRaw,
                    endRaw,
                );

                const distance = parseDistanceKm(distanceRaw);
                const operating = parseTimeRange(operatingRaw);
                const tripTime = parseFirstNumber(tripTimeRaw);
                const frequencyRange = parseNumberRange(frequencyEachTripRaw);

                const totalDistance = distance;

                // frequency: khoảng cách thời gian giữa các chuyến (phút)
                // ưu tiên lấy khoảng "from" của tần suất, fallback sang "to" hoặc tripTime
                const frequency =
                    frequencyRange.from || frequencyRange.to || tripTime || 0;

                const stationCodesForRoute =
                    routeStationMap.get(routeCode) ?? [];

                /**
                 * stationIds có dạng:
                 *   Object<stationId, distanceFromPrevious>
                 *
                 * Hiện tại chưa có dữ liệu khoảng cách giữa các trạm,
                 * nên tạm thời hardcode distanceFromPrevious = null cho từng station.
                 */
                const stationIdsMap = new Map<string, string | null>();
                stationCodesForRoute.forEach((code) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    stationIdsMap.set(code, null as any);
                });

                const routeData: Partial<RouteEntity> = {
                    routeCode,
                    routeName: normalizeWhitespace(
                        `${startPoint} ↔ ${endPoint}`,
                    ),
                    transportType: TransportType.BUS,
                    startPoint,
                    endPoint,
                    frequency,
                    baseFare: 7000,
                    totalDistance,
                    isWheelchairAccessible: false,
                    status: RouteStatus.ACTIVE,
                    operatingTime: {
                        from: operating.from || '',
                        to: operating.to || '',
                    },
                    tripTime: tripTime || undefined,
                    // lưu tần suất mỗi chuyến (phút) dưới dạng khoảng from/to
                    frequencyOfEachTrip:
                        frequencyRange.from || frequencyRange.to
                            ? frequencyRange
                            : undefined,
                    // Mongoose hỗ trợ Map, sẽ cast giá trị null về kiểu phù hợp
                    stationIds: stationIdsMap as unknown as Map<string, string>,
                    operatorName: normalizeWhitespace(operatorRaw),
                    paymentMethods: parsePaymentMethods(paymentRaw),
                    note: normalizeWhitespace(noteRaw),
                };

                const existing = await routeRepository.find<RouteEntity>(
                    { routeCode },
                    { lean: true },
                );

                if (existing.length > 0) {
                    await routeRepository.update<RouteDoc>(
                        { routeCode },
                        routeData,
                    );
                } else {
                    await routeRepository.create<RouteEntity>(routeData);
                }

                successCount += 1;

                if ((successCount + errorCount) % 50 === 0) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `Processed ${successCount + errorCount}/${
                            dataRows.length
                        } routes...`,
                    );
                }
            } catch (err) {
                errorCount += 1;
                // eslint-disable-next-line no-console
                console.error(`Failed to sync route code "${routeCode}":`, err);
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `Route sync completed. Success: ${successCount}, Errors: ${errorCount}`,
        );
    } finally {
        await app.close();
    }
}

syncRoutes().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Route sync failed:', err);
    process.exit(1);
});
