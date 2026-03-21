import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';

export interface IGoogleAuthCodePayload {
    code: string;
    user: IAuthUser;
    state: string;
    expiresAt: number;
}
