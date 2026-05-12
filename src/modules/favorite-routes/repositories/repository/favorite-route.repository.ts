import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    FavoriteRouteEntity,
    FavoriteRouteDoc,
} from '@modules/favorite-routes/repositories/entities/favorite-route.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class FavoriteRouteRepository extends DBRepositoryBase<
    FavoriteRouteEntity,
    FavoriteRouteDoc
> {
    constructor(
        @InjectDatabaseModel(FavoriteRouteEntity.name)
        private readonly favoriteRouteModel: Model<FavoriteRouteEntity>,
    ) {
        super(favoriteRouteModel);
    }
}
