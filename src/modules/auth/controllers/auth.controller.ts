import {
    Body,
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    Req,
    Res,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '@modules/auth/services/auth.service';
import { LocalAuthGuard } from '@modules/auth/guards/local-auth.guard';
import { JwtRefreshGuard } from '@modules/auth/guards/jwt-refresh.guard';
import { GoogleAuthGuard } from '@modules/auth/guards/google-auth.guard';
import { CurrentUser, Public } from '@modules/auth/decorators/auth.decorator';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { LoginRequestDto } from '@modules/auth/dtos/request/login.request.dto';
import { RegisterRequestDto } from '@modules/auth/dtos/request/register.request.dto';
import { RefreshTokenRequestDto } from '@modules/auth/dtos/request/refresh-token.request.dto';
import { GoogleAuthCodeExchangeRequestDto } from '@modules/auth/dtos/request/google-auth-code-exchange.request.dto';
import {
    AccessTokenResponseDto,
    AuthTokenResponseDto,
    AuthUserResponseDto,
} from '@modules/auth/dtos/response/auth-token.response.dto';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {}

    @Public()
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({ summary: 'Login with Google OAuth2' })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description: 'Redirect to Google consent page',
    })
    googleAuth(): void {}

    @Public()
    @Get('google/mobile/callback')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Google OAuth mobile callback (debug only for testing in dev environment)',
    })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description:
            'Redirect to mobile app with short-lived auth_code and state',
    })
    googleMobileCallback(): string {
        return 'Login by mobile with google success';
    }

    @Public()
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Google OAuth callback (redirect with auth code)',
    })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description:
            'Redirect to mobile app with short-lived auth_code and state',
    })
    async googleAuthCallback(
        @Req() request: { user: IAuthUser; query?: { state?: string } },
        @Res() response: Response,
    ): Promise<void> {
        const state = request.query?.state;
        if (!state) {
            throw new BadRequestException(
                'Missing state in Google OAuth callback',
            );
        }

        const authCode = await this.authService.createGoogleAuthCode(
            request.user,
            state,
        );
        const mobileRedirectUrl = this.configService.get<string>(
            'auth.oauth.google.mobileRedirectUrl',
        );

        const url = new URL(mobileRedirectUrl);
        url.searchParams.set('auth_code', authCode);
        url.searchParams.set('state', state);
        response.redirect(url.toString());
    }

    @Public()
    @Post('google/exchange')
    @HttpCode(HttpStatus.OK)
    @LanguageResponse({ module: 'auth', successKey: 'googleLogin' })
    @ApiOperation({
        summary: 'Exchange short-lived Google auth code for access tokens',
    })
    @ApiBody({ type: GoogleAuthCodeExchangeRequestDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Google login successful',
        type: AuthTokenResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Auth code is invalid, expired, or state mismatched',
    })
    googleExchange(
        @Body() dto: GoogleAuthCodeExchangeRequestDto,
    ): Promise<AuthTokenResponseDto> {
        return this.authService.exchangeGoogleAuthCode(dto.authCode, dto.state);
    }

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @LanguageResponse({ module: 'auth', successKey: 'register' })
    @ApiOperation({ summary: 'Register a new account' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Account created successfully',
        type: AuthTokenResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Email already in use',
    })
    async register(
        @Body() dto: RegisterRequestDto,
    ): Promise<AuthTokenResponseDto> {
        return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LocalAuthGuard)
    @LanguageResponse({ module: 'auth', successKey: 'login' })
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginRequestDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Login successful',
        type: AuthTokenResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Invalid email or password',
    })
    async login(@CurrentUser() user: IAuthUser): Promise<AuthTokenResponseDto> {
        return this.authService.login(user);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtRefreshGuard)
    @LanguageResponse({ module: 'auth', successKey: 'refresh' })
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiBody({ type: RefreshTokenRequestDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Access token refreshed successfully',
        type: AccessTokenResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Refresh token is invalid or expired',
    })
    async refreshToken(
        @CurrentUser() user: IAuthUser,
    ): Promise<AccessTokenResponseDto> {
        return this.authService.refreshToken(user);
    }

    @Get('me')
    @ApiBearerAuth()
    @LanguageResponse({ module: 'auth', successKey: 'me' })
    @ApiOperation({ summary: 'Get current authenticated user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Current user profile',
        type: AuthUserResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Access token is invalid or expired',
    })
    getProfile(@CurrentUser() user: IAuthUser): AuthUserResponseDto {
        return user as AuthUserResponseDto;
    }
}
