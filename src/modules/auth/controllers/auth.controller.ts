import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
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
import { CurrentUser, Public } from '@modules/auth/decorators/auth.decorator';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { LoginRequestDto } from '@modules/auth/dtos/request/login.request.dto';
import { RegisterRequestDto } from '@modules/auth/dtos/request/register.request.dto';
import { RefreshTokenRequestDto } from '@modules/auth/dtos/request/refresh-token.request.dto';
import {
    AccessTokenResponseDto,
    AuthTokenResponseDto,
    AuthUserResponseDto,
} from '@modules/auth/dtos/response/auth-token.response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

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
