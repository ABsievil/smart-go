import { Module } from '@nestjs/common';
import { UserController } from '@modules/users/controllers/user.controller';
import { UserModule } from '@modules/users/user.module';
import { StationController } from '@modules/stations/controllers/station.controller';
import { RouteController } from '@modules/routes/controllers/route.controller';
import { RouteModule } from '@modules/routes/route.module';
import { StationModule } from '@modules/stations/station.module';
import { RoutingController } from '@modules/routing/controllers/routing.controller';
import { RoutingModule } from '@modules/routing/routing.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PaymentController } from '@modules/payment/controllers/payment.controller';
import { PaymentModule } from '@modules/payment/payment.module';

@Module({
    controllers: [
        UserController,
        RouteController,
        StationController,
        RoutingController,
        PaymentController,
    ],
    imports: [
        AuthModule,
        UserModule,
        RouteModule,
        StationModule,
        RoutingModule,
        PaymentModule,
    ],
})
export class RoutesSharedModule {}
