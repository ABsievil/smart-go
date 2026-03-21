import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
    Profile,
    Strategy,
    VerifyCallback,
} from 'passport-google-oauth20';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { AuthService } from '@modules/auth/services/auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(
    Strategy,
    AUTH_STRATEGY.GOOGLE,
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('auth.oauth.google.clientId'),
            clientSecret: configService.get<string>(
                'auth.oauth.google.clientSecret',
            ),
            callbackURL: configService.get<string>(
                'auth.oauth.google.callbackUrl',
            ),
            scope: ['email', 'profile'],
        });
    }

    async validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<void> {
        const user: IAuthUser = await this.authService.validateGoogleUser({
            providerId: profile.id,
            email: profile.emails?.[0]?.value ?? '',
            name: profile.displayName ?? '',
            avatar: profile.photos?.[0]?.value,
        });
        done(null, user);
    }
}
