import { Module } from '@nestjs/common';
import { MomoService } from '@modules/payment/services/momo.service';
import { PaymentService } from '@modules/payment/services/payment.service';
import { VnpayService } from '@modules/payment/services/vnpay.service';

@Module({
    providers: [VnpayService, MomoService, PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}
