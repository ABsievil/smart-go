import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { PaymentTransactionStatus } from '@modules/payment-transactions/enums/payment-transaction.enum';

/**
 * FE gọi sau khi có kết quả từ cổng thanh toán (chỉ field an toàn, không sửa đơn hàng gốc).
 */
export class PaymentTransactionUpdateRequestDto {
    @ApiProperty({
        enum: Object.values(PaymentTransactionStatus),
        enumName: 'PaymentTransactionStatus',
    })
    @IsEnum(PaymentTransactionStatus)
    @IsNotEmpty()
    status: PaymentTransactionStatus;

    @ApiPropertyOptional({ description: 'true nếu thanh toán thành công' })
    @IsOptional()
    success?: boolean;

    @ApiPropertyOptional({ example: '0' })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    responseCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(128)
    transactionNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    orderInfo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(64)
    payDate?: string;

    @ApiPropertyOptional({ description: 'Số tiền cổng xác nhận (VND)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    paidAmount?: number;

    @ApiPropertyOptional({ description: 'Mã ngân hàng / payType từ cổng' })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    bankCode?: string;

    @ApiPropertyOptional({ description: 'VNPAY: vnp_TransactionStatus' })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    transactionStatus?: string;
}
