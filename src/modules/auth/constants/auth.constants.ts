export const AUTH_STRATEGY = {
    JWT: 'jwt',
    JWT_REFRESH: 'jwt-refresh',
    LOCAL: 'local',
    GOOGLE: 'google',
} as const;

export const AUTH_METADATA = {
    IS_PUBLIC: 'auth:isPublic',
    ROLES: 'auth:roles',
} as const;

export const AUTH_OAUTH = {
    GOOGLE_AUTH_CODE_PREFIX: 'gac_',
    GOOGLE_AUTH_CODE_REDIS_KEY_PREFIX: 'oauth:google:auth-code:',
} as const;
