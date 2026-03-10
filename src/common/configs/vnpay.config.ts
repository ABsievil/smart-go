import { registerAs } from '@nestjs/config';

export default registerAs(
    'vnpay',
    (): Record<string, any> => ({
        tmnCode: process.env.VNPAY_TMN_CODE ?? '',
        hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
        paymentUrl:
            process.env.VNPAY_PAYMENT_URL ??
            'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrl:
            process.env.VNPAY_RETURN_URL ??
            'http://localhost:8000/api/v1/payments/vnpay-return',
        version: '2.1.0',
        locale: process.env.VNPAY_LOCALE ?? 'vn',
    }),
);
