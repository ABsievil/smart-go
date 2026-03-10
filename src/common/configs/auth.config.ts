import { registerAs } from '@nestjs/config';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            secret: process.env.JWT_SECRET ?? 'smart-go-jwt-secret',
            expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
            refreshSecret:
                process.env.JWT_REFRESH_SECRET ?? 'smart-go-jwt-refresh-secret',
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        },
    }),
);
