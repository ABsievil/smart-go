import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    PaymentTransactionEntity,
    PaymentTransactionDoc,
} from '@modules/payment-transactions/repositories/entities/payment-transaction.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class PaymentTransactionRepository extends DBRepositoryBase<
    PaymentTransactionEntity,
    PaymentTransactionDoc
> {
    constructor(
        @InjectDatabaseModel(PaymentTransactionEntity.name)
        private readonly paymentTransactionModel: Model<PaymentTransactionEntity>,
    ) {
        super(paymentTransactionModel);
    }
}
