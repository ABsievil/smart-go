import { registerAs } from '@nestjs/config';

export default registerAs(
    'app',
    (): Record<string, any> => ({
        nodeEnv: process.env.NODE_ENV ?? 'development',
        name: process.env.APP_NAME ?? 'Smart Go',
        version: process.env.APP_VERSION ?? '1.0.0',
        apiVersion: process.env.API_VERSION ?? '1',
        globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
        host: process.env.APP_HOST ?? '0.0.0.0',
        port: Number(process.env.APP_PORT ?? 8000),
        timezone: process.env.APP_TIMEZONE ?? 'UTC',
        language: process.env.APP_LANGUAGE ?? 'en',
    }),
);
