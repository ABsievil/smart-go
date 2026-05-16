import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';
import { OAuthClientPlatform } from '@modules/auth/enums/oauth-client-platform.enum';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean> {
        const platform = this.extractPlatform(context);
        const strategy =
            platform === OAuthClientPlatform.WEB
                ? AUTH_STRATEGY.GOOGLE_WEB
                : AUTH_STRATEGY.GOOGLE_APP;

        class PlatformGoogleGuard extends AuthGuard(strategy) {
            getAuthenticateOptions(
                ctx: ExecutionContext,
            ): Record<string, string> {
                const request = ctx.switchToHttp().getRequest<{
                    query?: { state?: string };
                }>();
                const state = request.query?.state;
                return state ? { state } : {};
            }
        }

        return new PlatformGoogleGuard().canActivate(context) as Promise<boolean>;
    }

    private extractPlatform(context: ExecutionContext): OAuthClientPlatform {
        const platform = context.switchToHttp().getRequest<{ params?: { platform?: string } }>()
            .params?.platform;

        if (
            !platform ||
            !Object.values(OAuthClientPlatform).includes(
                platform as OAuthClientPlatform,
            )
        ) {
            throw new BadRequestException(
                'Invalid OAuth platform. Use "web" or "app".',
            );
        }

        return platform as OAuthClientPlatform;
    }
}
