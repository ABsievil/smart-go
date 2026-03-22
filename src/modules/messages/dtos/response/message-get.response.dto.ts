import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class MessageGetResponseDto extends BaseResponseDto {
    @ApiProperty()
    @Expose()
    conversationId: string;

    @ApiProperty()
    @Expose()
    userId: string;

    @ApiProperty({ enum: UserRole })
    @Expose()
    role: UserRole;

    @ApiProperty()
    @Expose()
    content: string;

    @ApiPropertyOptional()
    @Expose()
    metadata?: Record<string, unknown>;
}
