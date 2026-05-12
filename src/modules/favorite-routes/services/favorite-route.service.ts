import { BadRequestException, Injectable } from '@nestjs/common';
import { FavoriteRouteRepository } from '@modules/favorite-routes/repositories/repository/favorite-route.repository';
import {
    FavoriteRouteEntity,
    FavoriteRouteDoc,
} from '@modules/favorite-routes/repositories/entities/favorite-route.entity';
import { FavoriteRouteCreateRequestDto } from '@modules/favorite-routes/dtos/request/favorite-route-create.request.dto';
import { FavoriteRouteUpdateRequestDto } from '@modules/favorite-routes/dtos/request/favorite-route-update.request.dto';
import { FavoriteRouteGetResponseDto } from '@modules/favorite-routes/dtos/response/favorite-route-get.response.dto';
import { BaseService } from '@common/services/base.service';

@Injectable()
export class FavoriteRouteService extends BaseService<
    FavoriteRouteEntity,
    FavoriteRouteDoc,
    FavoriteRouteGetResponseDto,
    FavoriteRouteCreateRequestDto,
    FavoriteRouteUpdateRequestDto,
    FavoriteRouteRepository
> {
    constructor(
        private readonly favoriteRouteRepository: FavoriteRouteRepository,
    ) {
        super(
            favoriteRouteRepository,
            FavoriteRouteEntity,
            FavoriteRouteGetResponseDto,
        );
    }

    async create(
        createDto: FavoriteRouteCreateRequestDto,
    ): Promise<FavoriteRouteDoc> {
        const { stationCode, coordinates } = createDto;

        if (!stationCode && !coordinates) {
            throw new BadRequestException(
                'Either stationCode or coordinates must be provided',
            );
        }

        const hasFrom = !!(stationCode?.from || coordinates?.from);
        const hasTo = !!(stationCode?.to || coordinates?.to);

        if (!hasFrom) {
            throw new BadRequestException(
                'Either stationCode.from or coordinates.from must be provided',
            );
        }

        if (!hasTo) {
            throw new BadRequestException(
                'Either stationCode.to or coordinates.to must be provided',
            );
        }
        return super.create(createDto);
    }
}
