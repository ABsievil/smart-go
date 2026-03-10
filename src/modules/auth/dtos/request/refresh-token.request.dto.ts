import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
    @ApiProperty({ example: 'refreshToken' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}
