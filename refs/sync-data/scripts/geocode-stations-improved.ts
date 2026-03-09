import 'reflect-metadata';
import { setTimeout as sleep } from 'timers/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';
import * as fs from 'fs';
import * as path from 'path';

interface GeocodeResult {
    lat: number;
    lon: number;
    provider: string;
}

interface CacheEntry {
    address: string;
    result: GeocodeResult | null;
    timestamp: number;
}

// ==================== CONFIGURATION ====================
const CONFIG = {
    // API Keys (set as environment variables)
    GOOGLE_MAPS_API_KEY: 'AIzaSyByYgoXzWkiKyGeYioAuUOd2Vc5ogU43tI',
    OPENCAGE_API_KEY: process.env.OPENCAGE_API_KEY || '',

    // Rate limiting (milliseconds)
    NOMINATIM_DELAY: 2000, // 2 seconds between requests
    GOOGLE_DELAY: 100, // 100ms between requests
    OPENCAGE_DELAY: 1000, // 1 second between requests

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 3000, // 3 seconds
    RETRY_BACKOFF_MULTIPLIER: 2,

    // Cache configuration
    CACHE_DIR: path.join(process.cwd(), 'refs', 'cache'),
    CACHE_FILE: 'geocode-cache.json',

    // Default location
    DEFAULT_CITY: 'Hồ Chí Minh',
    DEFAULT_COUNTRY: 'Việt Nam',

    // User Agent for Nominatim
    USER_AGENT:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ==================== CACHE MANAGER ====================
class GeocodeCache {
    private cache: Map<string, CacheEntry> = new Map();
    private cacheFilePath: string;

    constructor() {
        this.cacheFilePath = path.join(CONFIG.CACHE_DIR, CONFIG.CACHE_FILE);
        this.loadCache();
    }

    private loadCache(): void {
        try {
            if (!fs.existsSync(CONFIG.CACHE_DIR)) {
                fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
            }

            if (fs.existsSync(this.cacheFilePath)) {
                const data = fs.readFileSync(this.cacheFilePath, 'utf-8');
                const entries: CacheEntry[] = JSON.parse(data);
                for (const entry of entries) {
                    this.cache.set(entry.address.toLowerCase(), entry);
                }
                // eslint-disable-next-line no-console
                console.log(`✓ Loaded ${this.cache.size} cached addresses`);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load cache:', err);
        }
    }

    saveCache(): void {
        try {
            const entries = Array.from(this.cache.values());
            fs.writeFileSync(
                this.cacheFilePath,
                JSON.stringify(entries, null, 2),
            );
            // eslint-disable-next-line no-console
            console.log(`✓ Saved ${entries.length} addresses to cache`);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to save cache:', err);
        }
    }

    get(address: string): GeocodeResult | null | undefined {
        const entry = this.cache.get(address.toLowerCase());
        return entry?.result;
    }

    set(address: string, result: GeocodeResult | null): void {
        this.cache.set(address.toLowerCase(), {
            address,
            result,
            timestamp: Date.now(),
        });
    }

    has(address: string): boolean {
        return this.cache.has(address.toLowerCase());
    }
}

// ==================== GEOCODING PROVIDERS ====================

/**
 * Google Maps Geocoding API
 * Pros: Most accurate, best coverage, fastest
 * Cons: Requires API key, paid service (but has free tier)
 * Rate limit: 50 QPS
 */
async function geocodeWithGoogle(
    address: string,
): Promise<GeocodeResult | null> {
    if (!CONFIG.GOOGLE_MAPS_API_KEY) {
        return null;
    }

    const query = `${address}, ${CONFIG.DEFAULT_CITY}, ${CONFIG.DEFAULT_COUNTRY}`;
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', query);
    url.searchParams.set('key', CONFIG.GOOGLE_MAPS_API_KEY);
    url.searchParams.set('region', 'vn');

    try {
        const res = await fetch(url.toString());
        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        if (data.status === 'OK' && data.results?.length > 0) {
            const location = data.results[0].geometry.location;
            return {
                lat: location.lat,
                lon: location.lng,
                provider: 'google',
            };
        }

        return null;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Google Geocoding error:', err);
        return null;
    }
}

/**
 * OpenCage Geocoding API
 * Pros: Good accuracy, affordable, good rate limits
 * Cons: Requires API key, paid service (but has free tier: 2500/day)
 * Rate limit: 1 RPS for free tier
 */
async function geocodeWithOpenCage(
    address: string,
): Promise<GeocodeResult | null> {
    if (!CONFIG.OPENCAGE_API_KEY) {
        return null;
    }

    const query = `${address}, ${CONFIG.DEFAULT_CITY}, ${CONFIG.DEFAULT_COUNTRY}`;
    const url = new URL('https://api.opencagedata.com/geocode/v1/json');
    url.searchParams.set('q', query);
    url.searchParams.set('key', CONFIG.OPENCAGE_API_KEY);
    url.searchParams.set('countrycode', 'vn');
    url.searchParams.set('limit', '1');
    url.searchParams.set('language', 'vi');

    try {
        const res = await fetch(url.toString());
        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        if (data.results?.length > 0) {
            const result = data.results[0];
            return {
                lat: result.geometry.lat,
                lon: result.geometry.lng,
                provider: 'opencage',
            };
        }

        return null;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('OpenCage Geocoding error:', err);
        return null;
    }
}

/**
 * Nominatim (OpenStreetMap) Geocoding API
 * Pros: Free, no API key required
 * Cons: Strict rate limits, less reliable, can be blocked
 * Rate limit: 1 RPS
 */
async function geocodeWithNominatim(
    address: string,
): Promise<GeocodeResult | null> {
    const query = `${address}, ${CONFIG.DEFAULT_CITY}, ${CONFIG.DEFAULT_COUNTRY}`;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('q', query);
    url.searchParams.set('countrycodes', 'vn');

    try {
        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': CONFIG.USER_AGENT,
                Accept: 'application/json',
                'Accept-Language': 'vi,en;q=0.9',
            },
        });

        if (!res.ok) {
            if (res.status === 403) {
                // eslint-disable-next-line no-console
                console.warn('⚠️  Nominatim 403 Forbidden - IP may be blocked');
            }
            return null;
        }

        const data = (await res.json()) as Array<{
            lat: string;
            lon: string;
        }>;

        if (data && data.length > 0) {
            const first = data[0];
            const lat = Number(first.lat);
            const lon = Number(first.lon);

            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                return { lat, lon, provider: 'nominatim' };
            }
        }

        return null;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Nominatim Geocoding error:', err);
        return null;
    }
}

// ==================== GEOCODING WITH FALLBACK ====================

async function geocodeWithRetry(
    address: string,
    provider: 'google' | 'opencage' | 'nominatim',
    retryCount = 0,
): Promise<GeocodeResult | null> {
    let result: GeocodeResult | null = null;

    try {
        switch (provider) {
            case 'google':
                result = await geocodeWithGoogle(address);
                break;
            case 'opencage':
                result = await geocodeWithOpenCage(address);
                break;
            case 'nominatim':
                result = await geocodeWithNominatim(address);
                break;
        }

        return result;
    } catch (err) {
        if (retryCount < CONFIG.MAX_RETRIES) {
            const delay =
                CONFIG.RETRY_DELAY *
                Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, retryCount);
            // eslint-disable-next-line no-console
            console.warn(
                `Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} for ${provider} after ${delay}ms`,
            );
            await sleep(delay);
            return geocodeWithRetry(address, provider, retryCount + 1);
        }

        // eslint-disable-next-line no-console
        console.error(
            `Failed to geocode with ${provider} after ${CONFIG.MAX_RETRIES} retries:`,
            err,
        );
        return null;
    }
}

async function geocodeWithFallback(
    address: string,
): Promise<GeocodeResult | null> {
    if (!address || !address.trim()) {
        return null;
    }

    // Priority order: Google > OpenCage > Nominatim
    const providers: Array<{
        name: 'google' | 'opencage' | 'nominatim';
        delay: number;
        enabled: boolean;
    }> = [
        {
            name: 'google',
            delay: CONFIG.GOOGLE_DELAY,
            enabled: !!CONFIG.GOOGLE_MAPS_API_KEY,
        },
        {
            name: 'opencage',
            delay: CONFIG.OPENCAGE_DELAY,
            enabled: !!CONFIG.OPENCAGE_API_KEY,
        },
        {
            name: 'nominatim',
            delay: CONFIG.NOMINATIM_DELAY,
            enabled: true,
        },
    ];

    for (const provider of providers) {
        if (!provider.enabled) {
            continue;
        }

        const result = await geocodeWithRetry(address, provider.name);

        if (result) {
            return result;
        }

        // Wait before trying next provider
        await sleep(provider.delay);
    }

    return null;
}

// ==================== MAIN SYNC FUNCTION ====================

async function syncStationCoordinates(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    const cache = new GeocodeCache();

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

        // eslint-disable-next-line no-console
        console.log(
            `\n📍 Found ${stations.length} stations without coordinates`,
        );

        // Check which providers are available
        const availableProviders: string[] = [];
        if (CONFIG.GOOGLE_MAPS_API_KEY) availableProviders.push('Google Maps');
        if (CONFIG.OPENCAGE_API_KEY) availableProviders.push('OpenCage');
        availableProviders.push('Nominatim');

        // eslint-disable-next-line no-console
        console.log(
            `🔧 Available providers: ${availableProviders.join(', ')}\n`,
        );

        let total = 0;
        let skipped = 0;
        let fromCache = 0;
        let geocoded = 0;
        let failed = 0;

        const providerStats: Record<string, number> = {
            google: 0,
            opencage: 0,
            nominatim: 0,
        };

        for (const station of stations) {
            total += 1;

            // Double-check: skip if coordinates already exist
            if (
                station.coordinates?.latitude &&
                station.coordinates?.longitude
            ) {
                skipped += 1;
                continue;
            }

            // Skip if address is missing or empty
            if (!station.address || !station.address.trim()) {
                failed += 1;
                // eslint-disable-next-line no-console
                console.warn(
                    `⚠️  Skipping station "${station.stationName}" (${station.stationCode}): missing address`,
                );
                continue;
            }

            let result: GeocodeResult | null = null;

            // Check cache first
            if (cache.has(station.address)) {
                const cached = cache.get(station.address);
                if (cached !== undefined) {
                    result = cached;
                    if (result) {
                        fromCache += 1;
                    }
                }
            } else {
                // Geocode with fallback
                result = await geocodeWithFallback(station.address);
                // Save to cache
                cache.set(station.address, result);
            }

            if (!result) {
                failed += 1;
                // eslint-disable-next-line no-console
                console.warn(
                    `❌ Failed to geocode station "${station.stationName}" (${station.stationCode}): ${station.address}`,
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
                providerStats[result.provider] =
                    (providerStats[result.provider] || 0) + 1;

                // eslint-disable-next-line no-console
                console.log(
                    `✅ [${result.provider}] ${geocoded}/${total} - "${station.stationName}" (${station.stationCode}): lat=${result.lat}, lon=${result.lon}`,
                );
            }

            // Save cache periodically (every 10 stations)
            if (total % 10 === 0) {
                cache.saveCache();
            }

            // Progress update
            if (total % 50 === 0) {
                // eslint-disable-next-line no-console
                console.log(
                    `\n📊 Progress: ${total}/${stations.length} | Geocoded: ${geocoded} | Failed: ${failed} | Cached: ${fromCache}\n`,
                );
            }
        }

        // Final cache save
        cache.saveCache();

        // eslint-disable-next-line no-console
        console.log('\n' + '='.repeat(70));
        // eslint-disable-next-line no-console
        console.log('🎉 GEOCODING COMPLETED');
        // eslint-disable-next-line no-console
        console.log('='.repeat(70));
        // eslint-disable-next-line no-console
        console.log(`Total processed:           ${total}`);
        // eslint-disable-next-line no-console
        console.log(`✅ Successfully geocoded:  ${geocoded}`);
        // eslint-disable-next-line no-console
        console.log(`   - From cache:           ${fromCache}`);
        // eslint-disable-next-line no-console
        console.log(`   - Google Maps:          ${providerStats.google}`);
        // eslint-disable-next-line no-console
        console.log(`   - OpenCage:             ${providerStats.opencage}`);
        // eslint-disable-next-line no-console
        console.log(`   - Nominatim:            ${providerStats.nominatim}`);
        // eslint-disable-next-line no-console
        console.log(`❌ Failed:                 ${failed}`);
        // eslint-disable-next-line no-console
        console.log(`⏭️  Skipped (has coords):  ${skipped}`);
        // eslint-disable-next-line no-console
        console.log('='.repeat(70) + '\n');
    } finally {
        await app.close();
    }
}

// ==================== ENTRY POINT ====================

syncStationCoordinates().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Geocode stations failed:', err);
    process.exit(1);
});
