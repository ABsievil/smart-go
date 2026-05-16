import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class AuthUserResponseDto extends BaseResponseDto {
    @ApiProperty()
    @Expose()
    email: string;

    @ApiProperty()
    @Expose()
    name: string;

    @ApiProperty({
        enum: Object.values(UserRole),
        enumName: 'UserRole',
    })
    @Expose()
    role: UserRole;
}

export class AuthTokenResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    refreshToken: string;

    @ApiProperty({ type: () => AuthUserResponseDto })
    user: AuthUserResponseDto;
}

export class AccessTokenResponseDto {
    @ApiProperty()
    accessToken: string;
}
