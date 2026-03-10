import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';
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
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
