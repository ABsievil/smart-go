import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
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
        private readonly configService: ConfigService,
        private readonly routeService: RouteService,
        private readonly stationService: StationService,
        private readonly busSimulationService: BusSimulationService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) {}

    async onModuleInit(): Promise<void> {
        this.verifyTimezoneConfig();
        await this.loadAndInitialize();
        this.logNextCronFire();
    }

    /**
     * Tải lại lịch chạy xe mỗi ngày lúc 00:00 Asia/Ho_Chi_Minh.
     */
    @Cron('0 0 * * *', {
        name: 'bus-simulation-daily',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async reloadScheduleForNewDay(): Promise<void> {
        const timezone = this.configService.get<string>('app.timezone');
        const now = new Date();
        this.logger.log(
            `[CRON] bus-simulation-daily triggered at ${now.toISOString()} ` +
                `(local: ${now.toLocaleString('vi-VN', { timeZone: timezone })})`,
        );
        await this.loadAndInitialize();
        this.logNextCronFire();
    }

    private async loadAndInitialize(): Promise<void> {
        const start = Date.now();
        try {
            const [routeResult, stationResult] = await Promise.all([
                this.routeService.findAll({ status: RouteStatus.ACTIVE }),
                this.stationService.findAll({}),
            ]);

            await this.busSimulationService.initializeRoutes(
                routeResult.data as RouteEntity[],
                stationResult.data as StationEntity[],
            );

            this.logger.log(
                `Bus simulation initialized in ${Date.now() - start}ms`,
            );
        } catch (error) {
            this.logger.error(
                'Failed to initialize bus simulation',
                (error as Error).stack,
            );
        }
    }

    private verifyTimezoneConfig(): void {
        const timezone = this.configService.get<string>('app.timezone');
        const now = new Date();
        const localTime = now.toLocaleString('vi-VN', { timeZone: timezone });
        const processTimezone = process.env.TZ;

        if (processTimezone !== timezone) {
            this.logger.warn(
                `process.env.TZ="${processTimezone ?? 'not set'}" does not match app.timezone="${timezone}". ` +
                    `Date arithmetic may use the wrong offset. ` +
                    `Ensure TZ is set before the process starts (see main.ts).`,
            );
        } else {
            this.logger.log(
                `Timezone OK (app.timezone=${timezone}). Current time: ${localTime}`,
            );
        }
    }

    private logNextCronFire(): void {
        try {
            const job = this.schedulerRegistry.getCronJob(
                'bus-simulation-daily',
            );
            const next = job.nextDate();
            this.logger.log(
                `Next bus-simulation-daily cron fire: ${next.toISO()}`,
            );
        } catch {
            this.logger.warn(
                'Could not retrieve next cron fire time from SchedulerRegistry',
            );
        }
    }
}
