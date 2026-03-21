import { registerAs } from '@nestjs/config';

export default registerAs(
    'redis',
    (): Record<string, any> => ({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        username: process.env.REDIS_USERNAME ?? '',
        password: process.env.REDIS_PASSWORD ?? '',
        db: Number(process.env.REDIS_DB ?? 0),
        keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'smart-go:',
        url: process.env.REDIS_URL ?? '',
    }),
);
