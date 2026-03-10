import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import {
    AUTH_METADATA,
    AUTH_STRATEGY,
} from '@modules/auth/constants/auth.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard(AUTH_STRATEGY.JWT) {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            AUTH_METADATA.IS_PUBLIC,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) return true;
        return super.canActivate(context);
    }

    handleRequest<TUser = any>(err: any, user: TUser): TUser {
        if (err || !user) {
            throw (
                err ??
                new UnauthorizedException('Access token is invalid or expired')
            );
        }
        return user;
    }
}
