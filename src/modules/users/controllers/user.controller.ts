import { Controller, Get } from "@nestjs/common";


@Controller('users')
export class UserController {
    @Get()
    getUsers() {
        return 'Hello World';
    }
}