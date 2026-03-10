import { Injectable } from '@nestjs/common';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import {
    StationEntity,
    StationDoc,
} from '@modules/stations/repositories/entities/station.entity';
import { StationCreateRequestDto } from '@modules/stations/dtos/request/station-create.request.dto';
import { StationUpdateRequestDto } from '@modules/stations/dtos/request/station-update.request.dto';
import { StationGetResponseDto } from '@modules/stations/dtos/response/station-get.response.dto';
import { BaseService } from '@common/services/base.service';

@Injectable()
export class StationService extends BaseService<
    StationEntity,
    StationDoc,
    StationGetResponseDto,
    StationCreateRequestDto,
    StationUpdateRequestDto,
    StationRepository
> {
    constructor(private readonly stationRepository: StationRepository) {
        super(
            stationRepository,
            StationEntity,
            StationGetResponseDto,
            'Station',
        );
    }
}
