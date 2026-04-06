import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { PaymentOrderType } from '@modules/payment/enums/payment.enum';
import {
    PaymentGateway,
    PaymentTransactionStatus,
} from '@modules/payment-transactions/enums/payment-transaction.enum';

export class PaymentTransactionGetResponseDto extends BaseResponseDto {
    @ApiProperty()
    @Expose()
    userId: string;

    @ApiProperty({
        enum: Object.values(PaymentGateway),
        enumName: 'PaymentGateway',
    })
    @Expose()
    gateway: PaymentGateway;

    @ApiProperty()
    @Expose()
    txnRef: string;

    @ApiProperty()
    @Expose()
    amount: number;

    @ApiPropertyOptional()
    @Expose()
    paidAmount?: number;

    @ApiProperty()
    @Expose()
    orderDescription: string;

    @ApiProperty({
        enum: Object.values(PaymentOrderType),
        enumName: 'PaymentOrderType',
    })
    @Expose()
    orderType: PaymentOrderType;

    @ApiPropertyOptional()
    @Expose()
    bankCode?: string;

    @ApiPropertyOptional()
    @Expose()
    locale?: string;

    @ApiPropertyOptional()
    @Expose()
    ipAddr?: string;

    @ApiProperty({
        enum: Object.values(PaymentTransactionStatus),
        enumName: 'PaymentTransactionStatus',
    })
    @Expose()
    status: PaymentTransactionStatus;

    @ApiPropertyOptional()
    @Expose()
    success?: boolean;

    @ApiPropertyOptional()
    @Expose()
    responseCode?: string;

    @ApiPropertyOptional()
    @Expose()
    transactionNo?: string;

    @ApiPropertyOptional()
    @Expose()
    orderInfo?: string;

    @ApiPropertyOptional()
    @Expose()
    payDate?: string;

    @ApiPropertyOptional()
    @Expose()
    signatureValid?: boolean;

    @ApiPropertyOptional()
    @Expose()
    transactionStatus?: string;

    @ApiPropertyOptional()
    @Expose()
    metadata?: Record<string, unknown>;
}
