import { UserRole } from '@modules/users/enums/user-role.enum';

export interface IAuthUser {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
}
