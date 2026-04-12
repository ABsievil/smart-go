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
import { ChatbotController } from '@modules/chatbot/controllers/chatbot.controller';
import { ChatbotModule } from '@modules/chatbot/chatbot.module';
import { MessageController } from '@modules/messages/controllers/message.controller';
import { MessageModule } from '@modules/messages/message.module';
import { PaymentTransactionController } from '@modules/payment-transactions/controllers/payment-transaction.controller';
import { PaymentTransactionModule } from '@modules/payment-transactions/payment-transaction.module';
import { BusSimulationController } from '@modules/bus-simulations/controllers/bus-simulation.controller';
import { BusSimulationModule } from '@modules/bus-simulations/bus-simulation.module';

@Module({
    controllers: [
        UserController,
        RouteController,
        StationController,
        RoutingController,
        PaymentController,
        ChatbotController,
        MessageController,
        PaymentTransactionController,
        BusSimulationController,
    ],
    imports: [
        AuthModule,
        UserModule,
        RouteModule,
        StationModule,
        RoutingModule,
        PaymentModule,
        PaymentTransactionModule,
        ChatbotModule,
        MessageModule,
        BusSimulationModule,
    ],
})
export class RoutesSharedModule {}
