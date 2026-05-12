import { BaseResponseListDto } from '@common/dtos/base-response.list.dto';
import { FavoriteRouteGetResponseDto } from '@modules/favorite-routes/dtos/response/favorite-route-get.response.dto';

export class FavoriteRouteListResponseDto extends BaseResponseListDto<FavoriteRouteGetResponseDto> {}
