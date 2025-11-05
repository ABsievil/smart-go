import { Controller, Get } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Controller('users')
export class UserController {
    constructor(private readonly logger: PinoLogger) {
        this.logger.setContext(UserController.name);
    }

    @Get()
    getUsers() {
        this.logger.info({ action: 'getUsers' }, 'Fetching users');
        return 'Hello World';
    }
}
