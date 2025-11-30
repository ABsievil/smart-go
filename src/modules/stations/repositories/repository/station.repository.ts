import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    StationEntity,
    StationDoc,
} from '@modules/stations/repositories/entities/station.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class StationRepository extends DBRepositoryBase<
    StationEntity,
    StationDoc
> {
    constructor(
        @InjectDatabaseModel(StationEntity.name)
        private readonly stationModel: Model<StationEntity>,
    ) {
        super(stationModel);
    }
}
