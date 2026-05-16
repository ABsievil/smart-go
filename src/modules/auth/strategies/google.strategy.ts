import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';
import { AuthService } from '@modules/auth/services/auth.service';

@Injectable()
export class GoogleWebStrategy extends PassportStrategy(
    Strategy,
    AUTH_STRATEGY.GOOGLE_WEB,
) {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('auth.oauth.google.clientId'),
            clientSecret: configService.get<string>(
                'auth.oauth.google.clientSecret',
            ),
            callbackURL: configService.get<string>(
                'auth.oauth.google.callbackUrlWeb',
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
        await this.authService.authenticateGooglePassport(profile, done);
    }
}

@Injectable()
export class GoogleAppStrategy extends PassportStrategy(
    Strategy,
    AUTH_STRATEGY.GOOGLE_APP,
) {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('auth.oauth.google.clientId'),
            clientSecret: configService.get<string>(
                'auth.oauth.google.clientSecret',
            ),
            callbackURL: configService.get<string>(
                'auth.oauth.google.callbackUrlApp',
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
        await this.authService.authenticateGooglePassport(profile, done);
    }
}
