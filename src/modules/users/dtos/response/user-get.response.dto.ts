import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class UserGetResponseDto extends BaseResponseDto {
    @ApiProperty()
    @Expose()
    email: string;

    @ApiProperty()
    @Expose()
    name: string;

    @ApiProperty({ enum: UserRole })
    @Expose()
    role: UserRole;

    @ApiPropertyOptional({ description: 'Avatar URL' })
    @Expose()
    avatar?: string;
}
