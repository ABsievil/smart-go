import { Controller, Get } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Controller('stations')
export class StationController {
    constructor(private readonly pinoLogger: PinoLogger) {
        this.pinoLogger.setContext(StationController.name);
    }

    @Get()
    getStations() {
        this.pinoLogger.info({ action: 'getStations' }, 'Fetching stations');
        return 'Hello World';
    }
}
