import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthCodeExchangeRequestDto {
    @ApiProperty({
        example: 'gac_a1b2c3d4e5f6',
        description: 'Short-lived auth code returned from Google callback redirect',
    })
    @IsString()
    @IsNotEmpty()
    authCode: string;

    @ApiProperty({
        example: 'f0d8f6ce-ceaa-44cf-b967-c97d4d744444',
        description: 'Client generated state to protect OAuth flow',
    })
    @IsString()
    @IsNotEmpty()
    state: string;
}
