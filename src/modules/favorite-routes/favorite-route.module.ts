import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoriteRouteService } from '@modules/favorite-routes/services/favorite-route.service';
import { FavoriteRouteRepository } from '@modules/favorite-routes/repositories/repository/favorite-route.repository';
import {
    FavoriteRouteEntity,
    FavoriteRouteSchema,
} from '@modules/favorite-routes/repositories/entities/favorite-route.entity';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: FavoriteRouteEntity.name,
                    schema: FavoriteRouteSchema,
                },
            ],
            DB_CONNECTION_NAME,
        ),
    ],
    providers: [FavoriteRouteRepository, FavoriteRouteService],
    exports: [FavoriteRouteService],
})
export class FavoriteRouteModule {}
