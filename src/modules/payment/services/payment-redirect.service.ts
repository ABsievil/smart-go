import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentClientPlatform } from '@modules/payment/enums/payment.enum';
import { PaymentResultResponseDto } from '@modules/payment/dtos/response/payment-result.response.dto';

type PaymentGatewayKey = 'vnpay' | 'momo';

@Injectable()
export class PaymentRedirectService {
    constructor(private readonly configService: ConfigService) {}

    getGatewayReturnUrl(
        gateway: PaymentGatewayKey,
        platform: PaymentClientPlatform,
    ): string {
        const configKey =
            platform === PaymentClientPlatform.APP
                ? `${gateway}.returnUrlApp`
                : `${gateway}.returnUrlWeb`;
        const url = this.configService.get<string>(configKey);

        if (!url) {
            throw new InternalServerErrorException(
                `Missing ${gateway} return URL for platform "${platform}"`,
            );
        }

        return url;
    }

    buildClientRedirectUrl(
        gateway: PaymentGatewayKey,
        platform: PaymentClientPlatform,
        result: PaymentResultResponseDto,
    ): string {
        const configKey =
            platform === PaymentClientPlatform.APP
                ? `${gateway}.redirectUrlApp`
                : `${gateway}.redirectUrlWeb`;
        const base = this.configService.get<string>(configKey);

        if (!base) {
            throw new InternalServerErrorException(
                `Missing ${gateway} redirect URL for platform "${platform}"`,
            );
        }

        const url = new URL(base);
        url.searchParams.set('gateway', gateway);
        url.searchParams.set('success', String(result.success));
        url.searchParams.set('responseCode', result.responseCode);
        url.searchParams.set('txnRef', result.txnRef);

        if (result.amount !== undefined) {
            url.searchParams.set('amount', String(result.amount));
        }
        if (result.bankCode) {
            url.searchParams.set('bankCode', result.bankCode);
        }
        if (result.transactionNo) {
            url.searchParams.set('transactionNo', result.transactionNo);
        }
        if (result.orderInfo) {
            url.searchParams.set('orderInfo', result.orderInfo);
        }
        if (result.payDate) {
            url.searchParams.set('payDate', result.payDate);
        }

        return url.toString();
    }
}
