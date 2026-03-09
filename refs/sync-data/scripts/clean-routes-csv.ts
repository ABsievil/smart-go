import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

type CsvRow = string[];

function cleanField(value: string | undefined | null): string {
    if (!value) return '';
    return value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

async function readCsv(
    filePath: string,
): Promise<{ header: CsvRow; rows: CsvRow[] }> {
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
                records.push(record.map((v) => (v ?? '').toString()));
            }
        });

        stream.on('error', (err: Error) => reject(err));
        stream.on('end', () => {
            if (records.length === 0) {
                resolve({ header: [], rows: [] });
            } else {
                const [header, ...rows] = records;
                resolve({ header, rows });
            }
        });
    });
}

async function writeCsv(
    filePath: string,
    header: CsvRow,
    rows: CsvRow[],
): Promise<void> {
    return new Promise((resolve, reject) => {
        const stringifier = stringify();
        const writeStream = fs.createWriteStream(filePath);

        stringifier.on('error', (err: Error) => reject(err));
        writeStream.on('error', (err: Error) => reject(err));
        writeStream.on('finish', () => resolve());

        stringifier.pipe(writeStream);

        if (header.length > 0) {
            stringifier.write(header);
        }

        for (const row of rows) {
            stringifier.write(row);
        }

        stringifier.end();
    });
}

async function cleanRoutesCsv(): Promise<void> {
    const inputPath = path.join(
        process.cwd(),
        'refs',
        'Dữ liệu GTCC TPHCM.csv',
    );

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input CSV not found: ${inputPath}`);
    }

    const outputPath = path.join(
        process.cwd(),
        'refs',
        'Dữ liệu GTCC TPHCM.cleaned.csv',
    );

    // eslint-disable-next-line no-console
    console.log(`Reading: ${inputPath}`);
    const { header, rows } = await readCsv(inputPath);

    if (rows.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No data rows found, nothing to clean.');
        return;
    }

    const cleanedRows: CsvRow[] = rows.map((row) => {
        const cleaned = [...row];

        for (let i = 0; i < cleaned.length; i += 1) {
            cleaned[i] = cleanField(cleaned[i]);
        }

        return cleaned;
    });

    // eslint-disable-next-line no-console
    console.log(
        `Writing cleaned CSV to: ${outputPath} (rows: ${cleanedRows.length})`,
    );
    await writeCsv(outputPath, header, cleanedRows);

    // eslint-disable-next-line no-console
    console.log('Clean routes CSV completed.');
}

cleanRoutesCsv().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Clean routes CSV failed:', err);
    process.exit(1);
});
