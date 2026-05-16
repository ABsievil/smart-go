import { Module } from '@nestjs/common';
import { MomoService } from '@modules/payment/services/momo.service';
import { PaymentRedirectService } from '@modules/payment/services/payment-redirect.service';
import { PaymentService } from '@modules/payment/services/payment.service';
import { VnpayService } from '@modules/payment/services/vnpay.service';

@Module({
    providers: [
        VnpayService,
        MomoService,
        PaymentRedirectService,
        PaymentService,
    ],
    exports: [PaymentService],
})
export class PaymentModule {}
