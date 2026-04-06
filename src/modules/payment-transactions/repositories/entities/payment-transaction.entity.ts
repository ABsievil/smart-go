import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { PaymentOrderType } from '@modules/payment/enums/payment.enum';
import {
    PaymentGateway,
    PaymentTransactionStatus,
} from '@modules/payment-transactions/enums/payment-transaction.enum';

@Schema({ collection: 'payment_transactions', timestamps: true })
export class PaymentTransactionEntity extends DBEntityBase {
    @Prop({ required: true, index: true })
    userId: string;

    @Prop({
        required: true,
        type: String,
        enum: Object.values(PaymentGateway),
        index: true,
    })
    gateway: PaymentGateway;

    @Prop({ required: true, unique: true, index: true, trim: true })
    txnRef: string;

    @Prop({ required: true })
    amount: number;

    /** Số tiền gateway trả về (VNPAY: đã chia 100), nếu có */
    @Prop({ required: false })
    paidAmount?: number;

    @Prop({ required: true, trim: true })
    orderDescription: string;

    @Prop({
        required: true,
        type: String,
        enum: Object.values(PaymentOrderType),
    })
    orderType: PaymentOrderType;

    @Prop({ required: false, trim: true })
    bankCode?: string;

    @Prop({ required: false, trim: true })
    locale?: string;

    @Prop({ required: false, trim: true })
    ipAddr?: string;

    @Prop({
        required: true,
        type: String,
        enum: Object.values(PaymentTransactionStatus),
        default: PaymentTransactionStatus.PENDING,
        index: true,
    })
    status: PaymentTransactionStatus;

    @Prop({ required: false })
    success?: boolean;

    @Prop({ required: false, trim: true })
    responseCode?: string;

    @Prop({ required: false, trim: true })
    transactionNo?: string;

    @Prop({ required: false, trim: true })
    orderInfo?: string;

    @Prop({ required: false, trim: true })
    payDate?: string;

    @Prop({ required: false })
    signatureValid?: boolean;

    @Prop({ required: false, trim: true })
    transactionStatus?: string;

    @Prop({ required: false, type: Object })
    metadata?: Record<string, unknown>;
}

export type PaymentTransactionDoc = IDatabaseDocument<PaymentTransactionEntity>;
export const PaymentTransactionSchema = SchemaFactory.createForClass(
    PaymentTransactionEntity,
);
