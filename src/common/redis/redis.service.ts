import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client: Redis;

    constructor(private readonly configService: ConfigService) {
        const redisConfig =
            this.configService.get<Record<string, any>>('redis') ?? {};

        const options: RedisOptions = {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.username || undefined,
            password: redisConfig.password || undefined,
            db: redisConfig.db,
            keyPrefix: redisConfig.keyPrefix,
            lazyConnect: true,
        };

        this.client = redisConfig.url
            ? new Redis(redisConfig.url, options)
            : new Redis(options);
    }

    async onModuleInit(): Promise<void> {
        await this.client.connect();
        await this.client.ping();
        this.logger.log('Redis connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    getClient(): Redis {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds && ttlSeconds > 0) {
            await this.client.set(key, value, 'EX', ttlSeconds);
            return;
        }

        await this.client.set(key, value);
    }

    async del(key: string): Promise<number> {
        return this.client.del(key);
    }
}
