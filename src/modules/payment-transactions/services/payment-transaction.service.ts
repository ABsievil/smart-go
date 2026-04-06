import { Injectable } from '@nestjs/common';
import { BaseService } from '@common/services/base.service';
import { PaymentCreateRequestDto } from '@modules/payment/dtos/request/payment-create.request.dto';
import { PaymentTransactionRepository } from '@modules/payment-transactions/repositories/repository/payment-transaction.repository';
import {
    PaymentTransactionDoc,
    PaymentTransactionEntity,
} from '@modules/payment-transactions/repositories/entities/payment-transaction.entity';
import { PaymentTransactionCreateRequestDto } from '@modules/payment-transactions/dtos/request/payment-transaction-create.request.dto';
import { PaymentTransactionUpdateRequestDto } from '@modules/payment-transactions/dtos/request/payment-transaction-update.request.dto';
import { PaymentTransactionGetResponseDto } from '@modules/payment-transactions/dtos/response/payment-transaction-get.response.dto';
import { PaymentGateway } from '@modules/payment-transactions/enums/payment-transaction.enum';

@Injectable()
export class PaymentTransactionService extends BaseService<
    PaymentTransactionEntity,
    PaymentTransactionDoc,
    PaymentTransactionGetResponseDto,
    PaymentTransactionCreateRequestDto,
    PaymentTransactionUpdateRequestDto,
    PaymentTransactionRepository
> {
    constructor(
        private readonly paymentTransactionRepository: PaymentTransactionRepository,
    ) {
        super(
            paymentTransactionRepository,
            PaymentTransactionEntity,
            PaymentTransactionGetResponseDto,
        );
    }

    async recordPendingVnpay(
        userId: string,
        dto: PaymentCreateRequestDto,
        txnRef: string,
        ipAddr: string,
    ): Promise<string> {
        const payload: PaymentTransactionCreateRequestDto = {
            userId,
            gateway: PaymentGateway.VNPAY,
            txnRef,
            amount: dto.amount,
            orderDescription: dto.orderDescription,
            orderType: dto.orderType,
            bankCode: dto.bankCode,
            locale: dto.locale,
            ipAddr,
        };
        const doc = await this.create(payload);
        return String(doc._id);
    }

    async recordPendingMomo(
        userId: string,
        dto: PaymentCreateRequestDto,
        txnRef: string,
        ipAddr: string,
    ): Promise<string> {
        const payload: PaymentTransactionCreateRequestDto = {
            userId,
            gateway: PaymentGateway.MOMO,
            txnRef,
            amount: dto.amount,
            orderDescription: dto.orderDescription,
            orderType: dto.orderType,
            bankCode: dto.bankCode,
            locale: dto.locale,
            ipAddr,
        };
        const doc = await this.create(payload);
        return String(doc._id);
    }
}
