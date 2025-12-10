import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';

const DEFAULT_OUTPUT = path.join(
    process.cwd(),
    'refs',
    'stations-missing-coordinates.csv',
);

function toCsvRow(values: Array<string | number | undefined>): string {
    return values
        .map((v) => {
            if (v === undefined || v === null) return '';
            const s = String(v);
            if (s.includes('"') || s.includes(',') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        })
        .join(',');
}

async function exportMissingCoordinates(): Promise<void> {
    const outputPath = process.env.OUTPUT_PATH || DEFAULT_OUTPUT;
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);

        // Only stations lacking coordinates
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

        const header = toCsvRow([
            'stationCode',
            'stationName',
            'address',
            'url',
            'status',
            'hasShelter',
            'hasWheelchair',
            'hasElevator',
            'hasRamp',
        ]);

        const lines = [header];
        for (const s of stations) {
            lines.push(
                toCsvRow([
                    s.stationCode,
                    s.stationName,
                    s.address,
                    s.url,
                    s.status,
                    s.hasShelter ? 'true' : 'false',
                    s.hasWheelchair ? 'true' : 'false',
                    s.hasElevator ? 'true' : 'false',
                    s.hasRamp ? 'true' : 'false',
                ]),
            );
        }

        fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

        // eslint-disable-next-line no-console
        console.log(
            `Exported ${stations.length} stations without coordinates to ${outputPath}`,
        );
    } finally {
        await app.close();
    }
}

exportMissingCoordinates().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Export stations without coordinates failed:', err);
    process.exit(1);
});
