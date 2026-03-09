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
    StationStatus,
    StationType,
} from '@modules/stations/enums/station.enum';

interface CsvRow extends Array<string> {}

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
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

async function syncStations(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);

        // Đọc dữ liệu trạm từ file Stop_HCM.csv (đã được cập nhật / tổng hợp)
        const csvPath = path.join(process.cwd(), 'refs', 'Stop_HCM.csv');

        // eslint-disable-next-line no-console
        console.log(`Starting station sync from CSV: ${csvPath}`);

        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found at path: ${csvPath}`);
        }

        const rows = await readCsvFile(csvPath);

        if (rows.length === 0) {
            return;
        }

        // Bỏ header
        const dataRows = rows.slice(1);

        // eslint-disable-next-line no-console
        console.log(`Total stations to process: ${dataRows.length}`);

        let successCount = 0;
        let errorCount = 0;

        for (const row of dataRows) {
            const [
                rawStopCode, // 0 - stop_code
                rawStopName, // 1 - stop_name
                rawAddress, // 2 - address
                ,
                // 3 - routes (bỏ qua)
                rawUrl, // 4 - url
            ] = row;

            const stationCode = String(rawStopCode || '').trim();
            if (!stationCode) {
                continue;
            }

            try {
                const stationName = normalizeWhitespace(
                    rawStopName || stationCode,
                );
                const address = normalizeWhitespace(rawAddress || stationName);
                const url = normalizeWhitespace(rawUrl || '');

                const stationData: Partial<StationEntity> = {
                    stationCode,
                    stationName,
                    address,
                    url: url || undefined,
                    stationType: StationType.BUS_STOP,
                    hasShelter: false,
                    hasWheelchair: false,
                    hasElevator: false,
                    hasRamp: false,
                    status: StationStatus.ACTIVE,
                };

                const existing = await stationRepository.find<StationEntity>(
                    { stationCode },
                    { lean: true },
                );

                if (existing.length > 0) {
                    await stationRepository.update<StationDoc>(
                        { stationCode },
                        stationData,
                    );
                } else {
                    await stationRepository.create<StationEntity>(stationData);
                }

                successCount += 1;

                if ((successCount + errorCount) % 200 === 0) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `Processed ${successCount + errorCount}/${
                            dataRows.length
                        } stations...`,
                    );
                }
            } catch (err) {
                errorCount += 1;
                // eslint-disable-next-line no-console
                console.error(
                    `Failed to sync station code "${rawStopCode}":`,
                    err,
                );
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `Station sync completed. Success: ${successCount}, Errors: ${errorCount}`,
        );
    } finally {
        await app.close();
    }
}

syncStations().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Station sync failed:', err);
    process.exit(1);
});
