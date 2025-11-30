import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StationService } from '@modules/stations/services/station.service';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import {
    StationEntity,
    StationSchema,
} from '@modules/stations/repositories/entities/station.entity';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: StationEntity.name,
                    schema: StationSchema,
                },
            ],
            DB_CONNECTION_NAME,
        ),
    ],
    providers: [StationRepository, StationService],
    controllers: [],
    exports: [StationService],
})
export class StationModule {}
