import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';

@Injectable()
export class GoogleAuthGuard extends AuthGuard(AUTH_STRATEGY.GOOGLE) {
    getAuthenticateOptions(context: ExecutionContext): Record<string, string> {
        const request = context.switchToHttp().getRequest<{
            query?: { state?: string };
        }>();

        const state = request.query?.state;
        return state ? { state } : {};
    }
}
