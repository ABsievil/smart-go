import {
    Body,
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseEnumPipe,
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
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '@modules/auth/services/auth.service';
import { LocalAuthGuard } from '@modules/auth/guards/local-auth.guard';
import { JwtRefreshGuard } from '@modules/auth/guards/jwt-refresh.guard';
import { GoogleAuthGuard } from '@modules/auth/guards/google-auth.guard';
import { CurrentUser, Public } from '@modules/auth/decorators/auth.decorator';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { Encryption } from '@common/encryption/decorators/encryption.decorator';
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
import { Response } from 'express';
import { AuthOAuthRedirectService } from '@modules/auth/services/auth-oauth-redirect.service';
import { OAuthClientPlatform } from '@modules/auth/enums/oauth-client-platform.enum';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly authOAuthRedirectService: AuthOAuthRedirectService,
    ) {}

    @Public()
    @Get('google/:platform')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Login with Google OAuth2 (web or app)',
    })
    @ApiParam({
        name: 'platform',
        enum: Object.values(OAuthClientPlatform),
        enumName: 'OAuthClientPlatform',
    })
    @ApiQuery({
        name: 'state',
        required: true,
        description: 'Client-generated CSRF state',
    })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description: 'Redirect to Google consent page',
    })
    googleAuth(
        @Param(
            'platform',
            new ParseEnumPipe(OAuthClientPlatform),
        )
        _platform: OAuthClientPlatform,
    ): void {}

    @Public()
    @Get('google/callback/:platform')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary:
            'Google OAuth callback — issue auth code, redirect to web or app URL',
    })
    @ApiParam({
        name: 'platform',
        enum: Object.values(OAuthClientPlatform),
        enumName: 'OAuthClientPlatform',
    })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description:
            'Redirect to client with short-lived auth_code and state',
    })
    async googleAuthCallback(
        @Param(
            'platform',
            new ParseEnumPipe(OAuthClientPlatform),
        )
        platform: OAuthClientPlatform,
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
        const redirectUrl = this.authOAuthRedirectService.buildGoogleRedirectUrl(
            platform,
            authCode,
            state,
        );
        response.redirect(redirectUrl);
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
    @Encryption()
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
