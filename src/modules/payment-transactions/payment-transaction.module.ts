import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentTransactionService } from '@modules/payment-transactions/services/payment-transaction.service';
import { PaymentTransactionRepository } from '@modules/payment-transactions/repositories/repository/payment-transaction.repository';
import {
    PaymentTransactionEntity,
    PaymentTransactionSchema,
} from '@modules/payment-transactions/repositories/entities/payment-transaction.entity';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: PaymentTransactionEntity.name,
                    schema: PaymentTransactionSchema,
                },
            ],
            DB_CONNECTION_NAME,
        ),
    ],
    providers: [PaymentTransactionRepository, PaymentTransactionService],
    exports: [PaymentTransactionService, PaymentTransactionRepository],
})
export class PaymentTransactionModule {}
