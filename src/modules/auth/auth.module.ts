import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@modules/users/user.module';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthController } from '@modules/auth/controllers/auth.controller';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@modules/auth/strategies/jwt-refresh.strategy';
import { LocalStrategy } from '@modules/auth/strategies/local.strategy';
import { GoogleStrategy } from '@modules/auth/strategies/google.strategy';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

@Module({
    imports: [
        UserModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('auth.jwt.secret'),
                signOptions: {
                    expiresIn: config.get<StringValue>('auth.jwt.expiresIn'),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        JwtRefreshStrategy,
        LocalStrategy,
        GoogleStrategy,
        // Apply JwtAuthGuard globally — use @Public() to bypass
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        // Apply RolesGuard globally — use @Roles(...) to restrict access
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
    ],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}
