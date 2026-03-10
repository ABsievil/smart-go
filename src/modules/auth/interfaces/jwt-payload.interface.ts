import { UserRole } from '@modules/users/enums/user-role.enum';

export interface IJwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
