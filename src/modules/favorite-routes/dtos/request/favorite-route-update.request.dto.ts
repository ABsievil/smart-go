import { PartialType } from '@nestjs/swagger';
import { FavoriteRouteCreateRequestDto } from '@modules/favorite-routes/dtos/request/favorite-route-create.request.dto';

export class FavoriteRouteUpdateRequestDto extends PartialType(
    FavoriteRouteCreateRequestDto,
) {}
