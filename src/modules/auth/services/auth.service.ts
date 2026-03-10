import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UserService } from '@modules/users/services/user.service';
import { IJwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { LoginRequestDto } from '@modules/auth/dtos/request/login.request.dto';
import { RegisterRequestDto } from '@modules/auth/dtos/request/register.request.dto';
import {
    AccessTokenResponseDto,
    AuthTokenResponseDto,
} from '@modules/auth/dtos/response/auth-token.response.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async validateUser(
        email: string,
        password: string,
    ): Promise<IAuthUser | null> {
        const user = await this.userService.findByEmail(email);
        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return null;

        return {
            _id: user._id as string,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }

    async login(user: IAuthUser): Promise<AuthTokenResponseDto> {
        const tokens = this._generateTokens(user);
        return { ...tokens, user };
    }

    async register(dto: RegisterRequestDto): Promise<AuthTokenResponseDto> {
        const emailExists = await this.userService.existsByEmail(dto.email);
        if (emailExists) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const newUser = await this.userService.create({
            email: dto.email,
            name: dto.name,
            password: hashedPassword,
        });

        const authUser: IAuthUser = {
            _id: newUser._id as string,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
        };

        return this.login(authUser);
    }

    async refreshToken(user: IAuthUser): Promise<AccessTokenResponseDto> {
        const payload: IJwtPayload = {
            sub: user._id,
            email: user.email,
            role: user.role,
        };
        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

    private _generateTokens(
        user: IAuthUser,
    ): Pick<AuthTokenResponseDto, 'accessToken' | 'refreshToken'> {
        const payload: IJwtPayload = {
            sub: user._id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('auth.jwt.refreshSecret'),
            expiresIn: this.configService.get<StringValue>(
                'auth.jwt.refreshExpiresIn',
            ),
        });

        return { accessToken, refreshToken };
    }
}
