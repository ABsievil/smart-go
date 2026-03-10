import {
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
} from '@nestjs/common';
import { AUTH_METADATA } from '@modules/auth/constants/auth.constants';
import { IAuthUser } from '@modules/auth/interfaces/auth-user.interface';
import { UserRole } from '@modules/users/enums/user-role.enum';

/**
 * Mark a route as public — bypasses JwtAuthGuard.
 * @example @Public()
 */
export const Public = () => SetMetadata(AUTH_METADATA.IS_PUBLIC, true);

/**
 * Restrict a route to specific roles.
 * @example @Roles(UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]) =>
    SetMetadata(AUTH_METADATA.ROLES, roles);

/**
 * Extract the authenticated user (or a specific field) from the request.
 * @example @CurrentUser() user: IAuthUser
 * @example @CurrentUser('_id') userId: string
 */
export const CurrentUser = createParamDecorator(
    (field: keyof IAuthUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<{ user: IAuthUser }>();
        const user = request.user;
        return field ? user?.[field] : user;
    },
);
