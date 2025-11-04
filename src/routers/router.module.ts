import { Module } from "@nestjs/common";
import { RoutesSharedModule } from "src/routers/routes/routes.shared.module";
import { RouterModule as NestJsRouterModule } from '@nestjs/core';

@Module({
    imports: [
        RoutesSharedModule, 
        NestJsRouterModule.register([
            {
                path: '/',
                module: RoutesSharedModule,
            },
        ])
    ],
    
})
export class RouterModule {}