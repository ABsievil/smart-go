import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class AuthUserResponseDto {
    @ApiProperty()
    _id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ enum: UserRole })
    role: UserRole;
}

export class AuthTokenResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    refreshToken: string;

    @ApiProperty()
    user: AuthUserResponseDto;
}
