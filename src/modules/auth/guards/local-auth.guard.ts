import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_STRATEGY } from '@modules/auth/constants/auth.constants';

@Injectable()
export class LocalAuthGuard extends AuthGuard(AUTH_STRATEGY.LOCAL) {}
