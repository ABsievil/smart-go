import 'reflect-metadata';
import { setTimeout as sleep } from 'timers/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';

interface GeocodeResult {
    lat: number;
    lon: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
// Nominatim requires a valid User-Agent with real email
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_INTERVAL_MS = 2000; // Increased delay to respect rate limits
const DEFAULT_CITY = 'Hồ Chí Minh';
const DEFAULT_COUNTRY = 'Việt Nam';

function buildQuery(address: string): string {
    if (!address || !address.trim()) {
        return `${DEFAULT_CITY}, ${DEFAULT_COUNTRY}`;
    }

    const parts = [address.trim(), DEFAULT_CITY, DEFAULT_COUNTRY]
        .filter(Boolean)
        .map((p) => p.trim());
    return parts.join(', ');
}

async function geocode(address: string): Promise<GeocodeResult | null> {
    const query = buildQuery(address);
    if (!query) return null;

    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('q', query);
    url.searchParams.set('countrycodes', 'vn');

    try {
        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            // eslint-disable-next-line no-console
            console.warn(
                `Geocode failed (${res.status}) for: ${query.substring(0, 80)}...`,
            );
            if (res.status === 403) {
                // eslint-disable-next-line no-console
                console.warn(
                    '403 Forbidden - Nominatim may be blocking requests. Try again later or use a different geocoding service.',
                );
            }
            return null;
        }

        const data = (await res.json()) as Array<{
            lat: string;
            lon: string;
        }> | null;
        if (!data || data.length === 0) {
            return null;
        }

        const first = data[0];
        const lat = Number(first.lat);
        const lon = Number(first.lon);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { lat, lon };
        }

        return null;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Geocode error for "${query.substring(0, 60)}...":`, err);
        return null;
    }
}

async function geocodeStationsByAddress(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);

        // Query only stations without coordinates for optimization
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
        let skippedHasCoords = 0;
        let geocoded = 0;
        let failed = 0;

        for (const station of stations) {
            total += 1;

            // Double-check: skip if coordinates already exist
            if (
                station.coordinates?.latitude &&
                station.coordinates?.longitude
            ) {
                skippedHasCoords += 1;
                continue;
            }

            // Skip if address is missing or empty
            if (!station.address || !station.address.trim()) {
                failed += 1;
                // eslint-disable-next-line no-console
                console.warn(
                    `Skipping station "${station.stationName}" (${station.stationCode}): missing address`,
                );
                continue;
            }

            // Geocode using only the address field
            const result = await geocode(station.address);

            if (!result) {
                failed += 1;
                // eslint-disable-next-line no-console
                console.warn(
                    `Failed to geocode address for station "${station.stationName}" (${station.stationCode}): ${station.address}`,
                );
            } else {
                const updateData: Partial<StationEntity> = {
                    coordinates: {
                        latitude: result.lat,
                        longitude: result.lon,
                    },
                };

                await stationRepository.update(
                    { stationCode: station.stationCode },
                    updateData,
                );

                geocoded += 1;
                // eslint-disable-next-line no-console
                console.log(
                    `✓ Geocoded station "${station.stationName}" (${station.stationCode}): lat=${result.lat}, lon=${result.lon}`,
                );
            }

            // Respect rate limits
            await sleep(REQUEST_INTERVAL_MS);
        }

        // eslint-disable-next-line no-console
        console.log(
            `\nGeocode by address completed.\nTotal processed: ${total}\nGeocoded: ${geocoded}\nFailed: ${failed}\nSkipped (existing coords): ${skippedHasCoords}`,
        );
    } finally {
        await app.close();
    }
}

geocodeStationsByAddress().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Geocode stations by address failed:', err);
    process.exit(1);
});
