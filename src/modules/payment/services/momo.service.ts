import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
    IMomoCallbackParams,
    IMomoCreatePaymentParams,
} from '@modules/payment/interfaces/momo-params.interface';

interface IMomoCreatePaymentResponse {
    resultCode: number;
    message: string;
    payUrl?: string;
}

@Injectable()
export class MomoService {
    private readonly partnerCode: string;
    private readonly accessKey: string;
    private readonly secretKey: string;
    private readonly endpoint: string;
    private readonly returnUrl: string;
    private readonly ipnUrl: string;
    private readonly requestType: string;
    private readonly lang: string;
    private readonly autoCapture: boolean;

    constructor(private readonly configService: ConfigService) {
        this.partnerCode = configService.get<string>('momo.partnerCode') ?? '';
        this.accessKey = configService.get<string>('momo.accessKey') ?? '';
        this.secretKey = configService.get<string>('momo.secretKey') ?? '';
        this.endpoint = configService.get<string>('momo.endpoint') ?? '';
        this.returnUrl = configService.get<string>('momo.returnUrl') ?? '';
        this.ipnUrl = configService.get<string>('momo.ipnUrl') ?? '';
        this.requestType =
            configService.get<string>('momo.requestType') ?? 'captureWallet';
        this.lang = configService.get<string>('momo.lang') ?? 'vi';
        this.autoCapture =
            configService.get<boolean>('momo.autoCapture') ?? true;
    }

    async createPaymentUrl(params: IMomoCreatePaymentParams): Promise<string> {
        const amount = String(params.amount);
        const orderId = params.txnRef;
        const requestId = params.txnRef;
        const orderInfo = params.orderDescription;
        const extraData = '';

        const rawSignature = this.buildCreateRawSignature({
            accessKey: this.accessKey,
            amount,
            extraData,
            ipnUrl: this.ipnUrl,
            orderId,
            orderInfo,
            partnerCode: this.partnerCode,
            redirectUrl: this.returnUrl,
            requestId,
            requestType: this.requestType,
        });
        const signature = this.hmacSha256(this.secretKey, rawSignature);

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                partnerCode: this.partnerCode,
                partnerName: 'smart-go',
                storeId: 'smart-go',
                requestId,
                amount,
                orderId,
                orderInfo,
                redirectUrl: this.returnUrl,
                ipnUrl: this.ipnUrl,
                lang: this.lang,
                requestType: this.requestType,
                autoCapture: this.autoCapture,
                extraData,
                signature,
            }),
        });

        const payload = (await response.json()) as IMomoCreatePaymentResponse;

        if (!response.ok || payload.resultCode !== 0 || !payload.payUrl) {
            throw new BadGatewayException(
                payload.message || 'Cannot create MoMo payment URL',
            );
        }

        return payload.payUrl;
    }

    verifySignature(params: IMomoCallbackParams): boolean {
        const rawSignature = this.buildCallbackRawSignature(params);
        const computed = this.hmacSha256(this.secretKey, rawSignature);
        return computed === params.signature;
    }

    private buildCreateRawSignature(payload: Record<string, string>): string {
        return [
            `accessKey=${payload.accessKey}`,
            `amount=${payload.amount}`,
            `extraData=${payload.extraData}`,
            `ipnUrl=${payload.ipnUrl}`,
            `orderId=${payload.orderId}`,
            `orderInfo=${payload.orderInfo}`,
            `partnerCode=${payload.partnerCode}`,
            `redirectUrl=${payload.redirectUrl}`,
            `requestId=${payload.requestId}`,
            `requestType=${payload.requestType}`,
        ].join('&');
    }

    private buildCallbackRawSignature(params: IMomoCallbackParams): string {
        return [
            `accessKey=${this.accessKey}`,
            `amount=${params.amount}`,
            `extraData=${params.extraData ?? ''}`,
            `message=${params.message}`,
            `orderId=${params.orderId}`,
            `orderInfo=${params.orderInfo}`,
            `orderType=${params.orderType ?? ''}`,
            `partnerCode=${params.partnerCode}`,
            `payType=${params.payType ?? ''}`,
            `requestId=${params.requestId}`,
            `responseTime=${params.responseTime ?? ''}`,
            `resultCode=${params.resultCode}`,
            `transId=${params.transId ?? ''}`,
        ].join('&');
    }

    private hmacSha256(secret: string, data: string): string {
        return crypto
            .createHmac('sha256', secret)
            .update(Buffer.from(data, 'utf-8'))
            .digest('hex');
    }
}
