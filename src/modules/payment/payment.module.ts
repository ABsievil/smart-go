import { Module } from '@nestjs/common';
import { PaymentService } from '@modules/payment/services/payment.service';
import { VnpayService } from '@modules/payment/services/vnpay.service';

@Module({
    providers: [VnpayService, PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}
