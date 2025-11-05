import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
