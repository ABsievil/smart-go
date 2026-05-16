import { registerAs } from '@nestjs/config';

export default registerAs(
    'momo',
    (): Record<string, any> => ({
        partnerCode: process.env.MOMO_PARTNER_CODE ?? '',
        accessKey: process.env.MOMO_ACCESS_KEY ?? '',
        secretKey: process.env.MOMO_SECRET_KEY ?? '',
        endpoint:
            process.env.MOMO_ENDPOINT ??
            'https://test-payment.momo.vn/v2/gateway/api/create',
        returnUrlWeb:
            process.env.MOMO_RETURN_URL_WEB ??
            process.env.MOMO_RETURN_URL ??
            `http://localhost:8000/api/v1/payments/momo/return/web`,
        returnUrlApp:
            process.env.MOMO_RETURN_URL_APP ??
            `http://localhost:8000/api/v1/payments/momo/return/app`,
        redirectUrlWeb:
            process.env.MOMO_REDIRECT_URL_WEB ??
            'http://localhost:3000/payment/result',
        redirectUrlApp:
            process.env.MOMO_REDIRECT_URL_APP ?? 'smartgo://payment/result',
        ipnUrl:
            process.env.MOMO_IPN_URL ??
            'http://localhost:8000/api/v1/payments/momo/ipn',
        requestType: process.env.MOMO_REQUEST_TYPE ?? 'captureWallet',
        autoCapture: process.env.MOMO_AUTO_CAPTURE
            ? process.env.MOMO_AUTO_CAPTURE === 'true'
            : true,
        lang: process.env.MOMO_LANG ?? 'vi',
    }),
);
