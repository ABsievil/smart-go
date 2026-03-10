import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';

@Injectable()
export class JwtRefreshGuard extends AuthGuard(AUTH_STRATEGY.JWT_REFRESH) {
    handleRequest<TUser = any>(err: any, user: TUser): TUser {
        if (err || !user) {
            throw (
                err ??
                new UnauthorizedException('Refresh token is invalid or expired')
            );
        }
        return user;
    }
}
