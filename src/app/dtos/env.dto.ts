import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumberString,
} from 'class-validator';

export class EnvironmentVariablesDto {
    // Server
    @IsOptional()
    @IsString()
    NODE_ENV?: string;

    // Database
    @IsNotEmpty()
    @IsString()
    DATABASE_URI: string;

    @IsOptional()
    @IsString()
    DATABASE_DEBUG?: string;

    // App
    @IsOptional()
    @IsString()
    APP_NAME?: string;

    @IsOptional()
    @IsString()
    APP_VERSION?: string;

    // API
    @IsOptional()
    @IsString()
    API_VERSION?: string;

    @IsOptional()
    @IsString()
    APP_GLOBAL_PREFIX?: string;

    @IsOptional()
    @IsString()
    APP_HOST?: string;

    @IsOptional()
    @IsNumberString()
    APP_PORT?: string;

    // Locale & Time
    @IsOptional()
    @IsString()
    APP_TIMEZONE?: string; // e.g., UTC, Asia/Ho_Chi_Minh

    @IsOptional()
    @IsString()
    APP_LANGUAGE?: string;

    // JWT
    @IsOptional()
    @IsString()
    JWT_SECRET?: string;

    @IsOptional()
    @IsString()
    JWT_EXPIRES_IN?: string;

    @IsOptional()
    @IsString()
    JWT_REFRESH_SECRET?: string;

    @IsOptional()
    @IsString()
    JWT_REFRESH_EXPIRES_IN?: string;
}
