import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    IsArray,
} from 'class-validator';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class UserCreateRequestDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(100)
    password: string;

    @ApiPropertyOptional({
        enum: UserRole,
        default: UserRole.USER,
    })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ description: 'Avatar URL' })
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiPropertyOptional({
        type: [String],
        description: 'Danh sách ID tuyến (Route) yêu thích',
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    favoriteRouteIds?: string[];

    @ApiPropertyOptional({
        type: [String],
        description: 'Danh sách ID trạm (Station) yêu thích',
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    favoriteStationIds?: string[];
}
