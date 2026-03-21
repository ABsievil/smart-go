import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from './user-create.request.dto';

export class UserUpdateRequestDto extends PartialType(
    PickType(UserCreateRequestDto, ['name', 'avatar'] as const),
) {}
