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
        oauth: {
            google: {
                clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
                clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
                callbackUrl:
                    process.env.GOOGLE_OAUTH_CALLBACK_URL ??
                    'http://localhost:8000/api/v1/auth/google/callback',
                mobileRedirectUrl:
                    process.env.GOOGLE_OAUTH_MOBILE_REDIRECT_URL ??
                    'myapp://auth/callback',
                authCodeTtlSeconds: Number(
                    process.env.GOOGLE_OAUTH_AUTH_CODE_TTL_SECONDS ?? 120,
                ),
            },
        },
    }),
);
