import { PartialType, PickType } from '@nestjs/swagger';
import { UserUpdateRequestDto } from './user-update.request.dto';

export class UserUpdateBodyRequestDto extends PartialType(
    PickType(UserUpdateRequestDto, [
        'name',
        'favoriteRouteIds',
        'favoriteStationIds',
    ] as const),
) {}
