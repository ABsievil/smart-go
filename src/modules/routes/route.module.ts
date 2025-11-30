import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouteService } from '@modules/routes/services/route.service';
import { RouteRepository } from '@modules/routes/repositories/repository/route.repository';
import {
    RouteEntity,
    RouteSchema,
} from '@modules/routes/repositories/entities/route.entity';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: RouteEntity.name,
                    schema: RouteSchema,
                },
            ],
            DB_CONNECTION_NAME,
        ),
    ],
    providers: [RouteRepository, RouteService],
    controllers: [],
    exports: [RouteService],
})
export class RouteModule {}
