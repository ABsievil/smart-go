import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseListDto<T> {
    @ApiProperty({ description: 'Total count' })
    total: number;

    @ApiProperty({ description: 'Page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Page size', example: 10 })
    limit: number;

    @ApiProperty({ description: 'List of items' })
    data: T[];
}
