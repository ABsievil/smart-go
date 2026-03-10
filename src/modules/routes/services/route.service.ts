import { Injectable } from '@nestjs/common';
import { RouteRepository } from '@modules/routes/repositories/repository/route.repository';
import {
    RouteEntity,
    RouteDoc,
} from '@modules/routes/repositories/entities/route.entity';
import { RouteCreateRequestDto } from '@modules/routes/dtos/request/route-create.request.dto';
import { RouteUpdateRequestDto } from '@modules/routes/dtos/request/route-update.request.dto';
import { RouteGetResponseDto } from '@modules/routes/dtos/response/route-get.response.dto';
import { BaseService } from '@common/services/base.service';

@Injectable()
export class RouteService extends BaseService<
    RouteEntity,
    RouteDoc,
    RouteGetResponseDto,
    RouteCreateRequestDto,
    RouteUpdateRequestDto,
    RouteRepository
> {
    constructor(private readonly routeRepository: RouteRepository) {
        super(routeRepository, RouteEntity, RouteGetResponseDto);
    }
}
