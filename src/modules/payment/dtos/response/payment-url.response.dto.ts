import { ApiProperty } from '@nestjs/swagger';

export class PaymentUrlResponseDto {
    @ApiProperty({ description: 'VNPAY payment URL to redirect the user to' })
    paymentUrl: string;

    @ApiProperty({ description: 'Unique transaction reference code' })
    txnRef: string;
}
