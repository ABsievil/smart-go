import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { PaymentOrderType } from '@modules/payment/enums/payment.enum';
import { PaymentGateway } from '@modules/payment-transactions/enums/payment-transaction.enum';

export class PaymentTransactionCreateRequestDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    userId: string;

    @ApiProperty({
        enum: Object.values(PaymentGateway),
        enumName: 'PaymentGateway',
    })
    @IsEnum(PaymentGateway)
    @IsNotEmpty()
    gateway: PaymentGateway;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    txnRef: string;

    @ApiProperty({ example: 100000 })
    @IsNumber()
    @Min(5000)
    amount: number;

    @ApiProperty({ example: 'Thanh toan ve xe' })
    @IsString()
    @IsNotEmpty()
    orderDescription: string;

    @ApiProperty({
        enum: Object.values(PaymentOrderType),
        enumName: 'PaymentOrderType',
    })
    @IsEnum(PaymentOrderType)
    orderType: PaymentOrderType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    locale?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ipAddr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
