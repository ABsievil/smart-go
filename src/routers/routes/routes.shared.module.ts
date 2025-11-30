import { Module } from '@nestjs/common';
import { UserController } from '@modules/users/controllers/user.controller';
import { UserModule } from '@modules/users/user.module';
import { StationController } from '@modules/stations/controllers/station.controller';
import { RouteController } from '@modules/routes/controllers/route.controller';
import { RouteModule } from '@modules/routes/route.module';
import { StationModule } from '@modules/stations/station.module';

@Module({
    controllers: [UserController, RouteController, StationController],
    imports: [UserModule, RouteModule, StationModule],
})
export class RoutesSharedModule {}
