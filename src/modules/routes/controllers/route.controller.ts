import { Controller, Get } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Controller('routes')
export class RouteController {
    constructor(private readonly pinoLogger: PinoLogger) {
        this.pinoLogger.setContext(RouteController.name);
    }

    @Get()
    getRoutes() {
        this.pinoLogger.info({ action: 'getRoutes' }, 'Fetching routes');
        return 'Hello World';
    }
}
