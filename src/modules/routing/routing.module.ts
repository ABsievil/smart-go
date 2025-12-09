import { Module } from '@nestjs/common';
import { RoutingController } from '@modules/routing/controllers/routing.controller';
import { RoutingService } from '@modules/routing/services/routing.service';
import { GraphBuilderService } from '@modules/routing/services/graph-builder.service';
import { RouteModule } from '@modules/routes/route.module';
import { StationModule } from '@modules/stations/station.module';

@Module({
    imports: [RouteModule, StationModule],
    providers: [GraphBuilderService, RoutingService],
    exports: [RoutingService, GraphBuilderService],
})
export class RoutingModule {}
