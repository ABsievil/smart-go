import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthClientPlatform } from '@modules/auth/enums/oauth-client-platform.enum';

@Injectable()
export class AuthOAuthRedirectService {
    constructor(private readonly configService: ConfigService) {}

    buildGoogleRedirectUrl(
        platform: OAuthClientPlatform,
        authCode: string,
        state: string,
    ): string {
        const configKey =
            platform === OAuthClientPlatform.APP
                ? 'auth.oauth.google.redirectUrlApp'
                : 'auth.oauth.google.redirectUrlWeb';
        const base = this.configService.get<string>(configKey);

        if (!base) {
            throw new InternalServerErrorException(
                `Missing Google OAuth redirect URL for platform "${platform}"`,
            );
        }

        const url = new URL(base);
        url.searchParams.set('auth_code', authCode);
        url.searchParams.set('state', state);
        return url.toString();
    }
}
