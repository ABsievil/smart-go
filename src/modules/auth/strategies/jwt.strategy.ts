import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
    ACCESS_TOKEN_QUERY_PARAM,
    AUTH_STRATEGY,
} from '@modules/auth/constants/auth.constants';
import { IJwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { UserService } from '@modules/users/services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AUTH_STRATEGY.JWT) {
    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (request: Request) => {
                    const raw = request.query[ACCESS_TOKEN_QUERY_PARAM];
                    if (typeof raw === 'string' && raw.length > 0) return raw;
                    if (Array.isArray(raw) && typeof raw[0] === 'string')
                        return raw[0];
                    return null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('auth.jwt.secret'),
        });
    }

    async validate(payload: IJwtPayload): Promise<IAuthUser> {
        const user = await this.userService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }
        return {
            _id: user._id as string,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }
}
