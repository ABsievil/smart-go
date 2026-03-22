import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResultResponseDto {
    @ApiProperty({ description: 'Whether the payment was successful' })
    success: boolean;

    @ApiProperty({ description: 'Gateway response code' })
    responseCode: string;

    @ApiProperty({ description: 'Transaction reference' })
    txnRef: string;

    @ApiPropertyOptional({ description: 'Amount paid in VND' })
    amount?: number;

    @ApiPropertyOptional({ description: 'Bank code used for payment' })
    bankCode?: string;

    @ApiPropertyOptional({ description: 'Gateway transaction number' })
    transactionNo?: string;

    @ApiPropertyOptional({ description: 'Order information' })
    orderInfo?: string;

    @ApiPropertyOptional({ description: 'Payment date (yyyyMMddHHmmss)' })
    payDate?: string;
}
