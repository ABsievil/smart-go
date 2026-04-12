import { Module } from '@nestjs/common';
import { RouteModule } from '@modules/routes/route.module';
import { StationModule } from '@modules/stations/station.module';
import { BusSimulationService } from '@modules/bus-simulations/services/bus-simulation.service';
import { BusSchedulerService } from '@modules/bus-simulations/services/bus-scheduler.service';

@Module({
    imports: [RouteModule, StationModule],
    providers: [BusSimulationService, BusSchedulerService],
    exports: [BusSimulationService],
})
export class BusSimulationModule {}
