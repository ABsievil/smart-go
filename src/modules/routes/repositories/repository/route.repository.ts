import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    RouteEntity,
    RouteDoc,
} from '@modules/routes/repositories/entities/route.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class RouteRepository extends DBRepositoryBase<RouteEntity, RouteDoc> {
    constructor(
        @InjectDatabaseModel(RouteEntity.name)
        private readonly routeModel: Model<RouteEntity>,
    ) {
        super(routeModel);
    }
}
