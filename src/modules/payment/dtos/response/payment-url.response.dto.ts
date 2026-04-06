import { ApiProperty } from '@nestjs/swagger';

export class PaymentUrlResponseDto {
    @ApiProperty({
        description: 'Payment URL to redirect the user to gateway checkout',
    })
    paymentUrl: string;

    @ApiProperty({ description: 'Unique transaction reference code' })
    txnRef: string;
}

export type PaymentUrlCreateResponse = PaymentUrlResponseDto & {
    paymentTransactionId: string;
};
