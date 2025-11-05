import { Controller, Get } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Controller('users')
export class UserController {
    constructor(private readonly pinoLogger: PinoLogger) {
        this.pinoLogger.setContext(UserController.name);
    }

    @Get()
    getUsers() {
        this.pinoLogger.info({ action: 'getUsers' }, 'Fetching users');
        return 'Hello World';
    }
}
