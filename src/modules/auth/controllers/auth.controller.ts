import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@modules/auth/services/auth.service';
import { LocalAuthGuard } from '@modules/auth/guards/local-auth.guard';
import { JwtRefreshGuard } from '@modules/auth/guards/jwt-refresh.guard';
import { CurrentUser, Public } from '@modules/auth/decorators/auth.decorator';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { LoginRequestDto } from '@modules/auth/dtos/request/login.request.dto';
import { RegisterRequestDto } from '@modules/auth/dtos/request/register.request.dto';
import { RefreshTokenRequestDto } from '@modules/auth/dtos/request/refresh-token.request.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new account' })
    register(@Body() dto: RegisterRequestDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LocalAuthGuard)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginRequestDto })
    login(@CurrentUser() user: IAuthUser) {
        return this.authService.login(user);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtRefreshGuard)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiBody({ type: RefreshTokenRequestDto })
    refreshToken(@CurrentUser() user: IAuthUser) {
        return this.authService.refreshToken(user);
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user profile' })
    getProfile(@CurrentUser() user: IAuthUser) {
        return user;
    }
}
