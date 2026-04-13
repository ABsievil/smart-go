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

/** Query param for JWT when clients cannot set headers (e.g. browser EventSource / SSE). */
export const ACCESS_TOKEN_QUERY_PARAM = 'token' as const;
