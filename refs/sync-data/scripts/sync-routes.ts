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

/**
 * Parse routeForwardIds và routeBackwardIds từ chuỗi (ví dụ: "BX 06 - Q1 031 - Q1 020")
 * và chuyển thành Map<string, string> với key là stationCode và value là distanceFromPrevious
 * Lưu ý: CSV không có thông tin distance, nên value sẽ là empty string ""
 */
function parseStationCodesToMap(
    stationCodesString: string | undefined,
): Map<string, string> {
    const map = new Map<string, string>();
    if (!stationCodesString) return map;

    const codes = stationCodesString
        .split('-')
        .map((code) => code.trim())
        .filter(Boolean);

    // Map<stationCode, distanceFromPrevious>
    // Key = stationCode (field số 1)
    // Value = distanceFromPrevious (field số 2) - để empty string vì CSV không có thông tin này
    codes.forEach((code) => {
        map.set(code, ''); // distanceFromPrevious không có trong CSV, để empty string
    });

    return map;
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

/**
 * Parse operator string thành operatorName và phoneNumber
 * Ví dụ: "Công ty TNHH..., ĐT: 028.3776.3777" -> { operatorName: "Công ty TNHH...", phoneNumber: "028.3776.3777" }
 */
function parseOperator(operatorRaw: string | undefined): {
    operatorName?: string;
    phoneNumber?: string;
} {
    if (!operatorRaw) {
        return {};
    }

    const cleaned = normalizeWhitespace(operatorRaw);
    if (!cleaned) {
        return {};
    }

    // Pattern để tìm số điện thoại: "ĐT:" hoặc "ĐT :" hoặc "ĐT" theo sau là số
    // Các pattern phổ biến: "ĐT: 028.3776.3777", "ĐT: 1900638494", "ĐT : 028.3776.3777"
    const phonePattern = /ĐT\s*:\s*([\d.\-\s]+)/i;
    const match = cleaned.match(phonePattern);

    if (match && match[1]) {
        const phoneNumber = normalizeWhitespace(match[1]);
        // Lấy phần trước "ĐT:" làm operatorName
        const operatorName = cleaned
            .substring(0, match.index)
            .replace(/,\s*$/, '') // Bỏ dấu phẩy cuối nếu có
            .trim();

        return {
            operatorName: operatorName || undefined,
            phoneNumber: phoneNumber || undefined,
        };
    }

    // Nếu không tìm thấy pattern "ĐT:", trả về toàn bộ làm operatorName
    return {
        operatorName: cleaned,
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

/**
 * Parse baseFare từ chuỗi (ví dụ: "- Vé lượt trợ giá: 5,000 VNĐ - Vé lượt trợ giá HSSV: 3,000 VNĐ")
 */
function parseBaseFare(baseFareRaw: string | undefined): string[] {
    if (!baseFareRaw) {
        return ['Vé lượt: 7,000 VNĐ']; // Giá trị mặc định
    }

    const cleaned = normalizeWhitespace(baseFareRaw);
    if (!cleaned) {
        return ['Vé lượt: 7,000 VNĐ'];
    }

    // Tách theo dấu "-" và lọc các phần tử rỗng
    const fares = cleaned
        .split('-')
        .map((f) => normalizeWhitespace(f))
        .filter(Boolean);

    return fares.length > 0 ? fares : ['Vé lượt: 7,000 VNĐ'];
}

/**
 * Map transportType từ CSV sang enum
 */
function mapTransportType(transportTypeRaw: string | undefined): TransportType {
    if (!transportTypeRaw) {
        return TransportType.PHO_THONG_CO_TRO_GIA; // Default
    }

    const cleaned = normalizeWhitespace(transportTypeRaw);

    // So sánh chính xác với enum values
    if (cleaned === TransportType.PHO_THONG_CO_TRO_GIA) {
        return TransportType.PHO_THONG_CO_TRO_GIA;
    }
    if (cleaned === TransportType.PHO_THONG_KHONG_TRO_GIA) {
        return TransportType.PHO_THONG_KHONG_TRO_GIA;
    }

    // Fallback: kiểm tra bằng contains
    const lower = cleaned.toLowerCase();
    if (lower.includes('phổ thông') && lower.includes('không trợ giá')) {
        return TransportType.PHO_THONG_KHONG_TRO_GIA;
    }

    return TransportType.PHO_THONG_CO_TRO_GIA; // Default
}

/**
 * Parse routeName để extract startPoint và endPoint
 * Ví dụ: "Bến Thành - Bến xe buýt Chợ Lớn" -> startPoint: "Bến Thành", endPoint: "Bến xe buýt Chợ Lớn"
 */
function parseRouteName(routeName: string | undefined): {
    startPoint?: string;
    endPoint?: string;
} {
    if (!routeName) {
        return {};
    }

    const cleaned = normalizeWhitespace(routeName);
    const parts = cleaned.split('-').map((p) => normalizeWhitespace(p));

    if (parts.length >= 2) {
        return {
            startPoint: parts[0],
            endPoint: parts.slice(1).join(' - '), // Join lại nếu có nhiều dấu "-"
        };
    }

    return {
        startPoint: cleaned,
    };
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
            'routes_full_with_stops.csv',
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

        let successCount = 0;
        let errorCount = 0;

        for (const row of dataRows) {
            // CSV columns: _id,routeCode,routeName,operator,transportType,totalDistance,vehicleType,operatingTime,baseFare,numTrips,tripTime,frequency,routeForward,routeForwardIds,routeBackward,routeBackwardIds
            const [
                _id,
                rawRouteCode,
                routeNameRaw,
                operatorRaw,
                transportTypeRaw,
                totalDistanceRaw,
                vehicleTypeRaw,
                operatingTimeRaw,
                baseFareRaw,
                numTripsRaw,
                tripTimeRaw,
                frequencyRaw,
                _routeForward,
                routeForwardIdsRaw,
                _routeBackward,
                routeBackwardIdsRaw,
            ] = row;

            const routeCode = normalizeRouteCode(rawRouteCode);
            if (!routeCode) {
                // Bỏ qua dòng không có mã tuyến
                continue;
            }

            try {
                // Parse routeName để extract startPoint và endPoint
                const { startPoint, endPoint } = parseRouteName(routeNameRaw);

                // Parse các field từ CSV
                const totalDistance = parseDistanceKm(totalDistanceRaw);
                const operating = parseTimeRange(operatingTimeRaw);
                const tripTime = tripTimeRaw
                    ? normalizeWhitespace(tripTimeRaw)
                    : undefined;
                const frequency = frequencyRaw
                    ? normalizeWhitespace(frequencyRaw)
                    : undefined;
                const vehicleType = vehicleTypeRaw
                    ? normalizeWhitespace(vehicleTypeRaw)
                    : undefined;
                const numTrips = numTripsRaw
                    ? normalizeWhitespace(numTripsRaw)
                    : undefined;

                // Parse baseFare
                const baseFare = parseBaseFare(baseFareRaw);

                // Parse operator thành operatorName và phoneNumber
                const { operatorName, phoneNumber } =
                    parseOperator(operatorRaw);

                // Map transportType
                const transportType = mapTransportType(transportTypeRaw);

                // Parse routeForwardIds và routeBackwardIds
                const routeForwardCodes = routeForwardIdsRaw
                    ? parseStationCodesToMap(routeForwardIdsRaw)
                    : new Map<string, string>();
                const routeBackwardCodes = routeBackwardIdsRaw
                    ? parseStationCodesToMap(routeBackwardIdsRaw)
                    : new Map<string, string>();

                const routeData: Partial<RouteEntity> = {
                    routeCode,
                    routeName: normalizeWhitespace(routeNameRaw || ''),
                    transportType,
                    startPoint,
                    endPoint,
                    frequency,
                    baseFare,
                    totalDistance,
                    vehicleType,
                    isWheelchairAccessible: false,
                    status: RouteStatus.ACTIVE,
                    operatingTime: {
                        from: operating.from || '',
                        to: operating.to || '',
                    },
                    tripTime,
                    numTrips,
                    routeForwardCodes,
                    routeBackwardCodes,
                    operatorName,
                    phoneNumber,
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
