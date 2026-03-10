export const AUTH_STRATEGY = {
    JWT: 'jwt',
    JWT_REFRESH: 'jwt-refresh',
    LOCAL: 'local',
} as const;

export const AUTH_METADATA = {
    IS_PUBLIC: 'auth:isPublic',
    ROLES: 'auth:roles',
} as const;
