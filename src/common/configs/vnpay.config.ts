import { registerAs } from '@nestjs/config';

export default registerAs(
    'vnpay',
    (): Record<string, any> => ({
        tmnCode: process.env.VNPAY_TMN_CODE ?? '',
        hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
        paymentUrl:
            process.env.VNPAY_PAYMENT_URL ??
            'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrlWeb:
            process.env.VNPAY_RETURN_URL_WEB ??
            process.env.VNPAY_RETURN_URL ??
            `http://localhost:8000/api/v1/payments/vnpay/return/web`,
        returnUrlApp:
            process.env.VNPAY_RETURN_URL_APP ??
            `http://localhost:8000/api/v1/payments/vnpay/return/app`,
        redirectUrlWeb:
            process.env.VNPAY_REDIRECT_URL_WEB ??
            'http://localhost:3000/payment/result',
        redirectUrlApp:
            process.env.VNPAY_REDIRECT_URL_APP ?? 'smartgo://payment/result',
        version: '2.1.0',
        locale: process.env.VNPAY_LOCALE ?? 'vn',
    }),
);
