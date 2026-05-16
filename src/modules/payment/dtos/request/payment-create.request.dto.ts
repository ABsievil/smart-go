import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import {
    PaymentClientPlatform,
    PaymentOrderType,
} from '@modules/payment/enums/payment.enum';

export class PaymentCreateRequestDto {
    @ApiProperty({
        description: 'Client platform — selects gateway return URL and post-payment redirect',
        enum: Object.values(PaymentClientPlatform),
        enumName: 'PaymentClientPlatform',
        example: PaymentClientPlatform.WEB,
    })
    @IsEnum(PaymentClientPlatform)
    platform: PaymentClientPlatform;

    @ApiProperty({
        description: 'Amount in VND (minimum 5,000)',
        example: 100000,
    })
    @IsNumber()
    @Min(5000)
    amount: number;

    @ApiProperty({
        description: 'Order description (no special characters)',
        example: 'Thanh toan ve xe buyt tuyen 01',
    })
    @IsString()
    @IsNotEmpty()
    orderDescription: string;

    @ApiProperty({
        description: 'Order type category',
        enum: Object.values(PaymentOrderType),
        enumName: 'PaymentOrderType',
        example: PaymentOrderType.OTHER,
    })
    @IsEnum(PaymentOrderType)
    orderType: PaymentOrderType;

    @ApiPropertyOptional({
        description: 'Bank code (leave empty to let customer choose)',
        example: 'NCB',
    })
    @IsOptional()
    @IsString()
    bankCode?: string;

    @ApiPropertyOptional({
        description: 'Display language on VNPAY gateway',
        example: 'vn',
        enum: ['vn', 'en'],
    })
    @IsOptional()
    @IsString()
    locale?: string;
}
