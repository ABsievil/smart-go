import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RouteService } from '@modules/routes/services/route.service';
import { StationService } from '@modules/stations/services/station.service';
import { BusSimulationService } from '@modules/bus-simulations/services/bus-simulation.service';
import { RouteEntity } from '@modules/routes/repositories/entities/route.entity';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';
import { RouteStatus } from '@modules/routes/enums/route.enum';

@Injectable()
export class BusSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(BusSchedulerService.name);

    constructor(
        private readonly routeService: RouteService,
        private readonly stationService: StationService,
        private readonly busSimulationService: BusSimulationService,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.loadAndInitialize();
    }

    /** Tải lại lịch chuyến theo ngày mới (00:00 Asia/Ho_Chi_Minh)
     *  demo chạy ổn qua đêm không cần restart server.
     */
    @Cron('0 0 * * *', {
        name: 'bus-simulation-daily',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async reloadScheduleForNewDay(): Promise<void> {
        this.logger.log(
            'Reloading bus simulation schedule for the new day (Asia/Ho_Chi_Minh)',
        );
        await this.loadAndInitialize();
    }

    private async loadAndInitialize(): Promise<void> {
        try {
            const [routeResult, stationResult] = await Promise.all([
                this.routeService.findAll({ status: RouteStatus.ACTIVE }),
                this.stationService.findAll({}),
            ]);

            await this.busSimulationService.initializeRoutes(
                routeResult.data as RouteEntity[],
                stationResult.data as StationEntity[],
            );
        } catch (error) {
            this.logger.error('Failed to initialize bus simulation', error);
        }
    }
}
