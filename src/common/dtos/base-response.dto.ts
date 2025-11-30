import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BaseResponseDto {
    @ApiProperty({ description: 'Entity ID' })
    @Expose()
    _id: string;

    @ApiPropertyOptional({ description: 'Created at' })
    @Expose()
    createdAt?: Date;

    @ApiPropertyOptional({ description: 'Created by' })
    @Expose()
    createdBy?: string;

    @ApiPropertyOptional({ description: 'Updated at' })
    @Expose()
    updatedAt?: Date;

    @ApiPropertyOptional({ description: 'Updated by' })
    @Expose()
    updatedBy?: string;
}
