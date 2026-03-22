import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class MessageCreateRequestDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    conversationId: string;

    @ApiProperty({ enum: UserRole, example: UserRole.USER })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @ApiProperty({ example: 'Xin chào' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32000)
    content: string;

    @ApiPropertyOptional({
        description: 'Optional payload (model, usage, citations, …)',
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
