import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
    IVnpayCallbackParams,
    IVnpayCreatePaymentParams,
} from '@modules/payment/interfaces/vnpay-params.interface';

@Injectable()
export class VnpayService {
    private readonly tmnCode: string;
    private readonly hashSecret: string;
    private readonly paymentUrl: string;
    private readonly returnUrl: string;
    private readonly version: string;
    private readonly locale: string;

    constructor(private readonly configService: ConfigService) {
        this.tmnCode = configService.get<string>('vnpay.tmnCode') ?? '';
        this.hashSecret = configService.get<string>('vnpay.hashSecret') ?? '';
        this.paymentUrl = configService.get<string>('vnpay.paymentUrl') ?? '';
        this.returnUrl = configService.get<string>('vnpay.returnUrl') ?? '';
        this.version = configService.get<string>('vnpay.version') ?? '2.1.0';
        this.locale = configService.get<string>('vnpay.locale') ?? 'vn';
    }

    createPaymentUrl(params: IVnpayCreatePaymentParams): string {
        const createDate = this.getVietnamDateTime();
        const expireDate = this.getVietnamDateTime(15);

        const vnpParams: Record<string, string> = {
            vnp_Version: this.version,
            vnp_Command: 'pay',
            vnp_TmnCode: this.tmnCode,
            vnp_Locale: params.locale ?? this.locale,
            vnp_CurrCode: 'VND',
            vnp_TxnRef: params.txnRef,
            vnp_OrderInfo: params.orderDescription,
            vnp_OrderType: params.orderType,
            vnp_Amount: String(params.amount * 100),
            vnp_ReturnUrl: this.returnUrl,
            vnp_IpAddr: params.ipAddr,
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
        };

        if (params.bankCode) {
            vnpParams['vnp_BankCode'] = params.bankCode;
        }

        const sortedParams = this.sortObject(vnpParams);
        const signData = this.buildSignatureData(sortedParams);
        const secureHash = this.hmacSha512(this.hashSecret, signData);

        sortedParams['vnp_SecureHash'] = secureHash;

        return `${this.paymentUrl}?${this.buildEncodedQueryString(sortedParams)}`;
    }

    verifySignature(params: IVnpayCallbackParams): boolean {
        const secureHash = params['vnp_SecureHash'];
        const verifyParams = { ...params };

        delete verifyParams['vnp_SecureHash'];
        delete verifyParams['vnp_SecureHashType'];

        const filteredParams = Object.fromEntries(
            Object.entries(verifyParams).filter(
                ([, v]) => v !== undefined && v !== null && v !== '',
            ),
        ) as Record<string, string>;

        const sortedParams = this.sortObject(filteredParams);
        const signData = this.buildSignatureData(sortedParams);
        const computedHash = this.hmacSha512(this.hashSecret, signData);

        return computedHash === secureHash;
    }

    /**
     * Formats current Vietnam time (GMT+7) as yyyyMMddHHmmss.
     * @param addMinutes - optional minutes to add (e.g. for expiry)
     */
    private getVietnamDateTime(addMinutes = 0): string {
        const now = new Date(Date.now() + addMinutes * 60 * 1000);
        const vietnamOffset = 7 * 60 * 60 * 1000;
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
        const vnDate = new Date(utcMs + vietnamOffset);

        const pad = (n: number) => String(n).padStart(2, '0');
        return (
            vnDate.getFullYear() +
            pad(vnDate.getMonth() + 1) +
            pad(vnDate.getDate()) +
            pad(vnDate.getHours()) +
            pad(vnDate.getMinutes()) +
            pad(vnDate.getSeconds())
        );
    }

    private hmacSha512(secret: string, data: string): string {
        return crypto
            .createHmac('sha512', secret)
            .update(Buffer.from(data, 'utf-8'))
            .digest('hex');
    }

    /**
     * Builds the query string used for HMAC-SHA512 signature computation.
     */
    private buildSignatureData(params: Record<string, string>): string {
        return Object.entries(params)
            .map(([key, value]) => `${key}=${this.urlEncodeValue(value)}`)
            .join('&');
    }

    /**
     * Builds a URL-encoded query string for the final redirect URL.
     */
    private buildEncodedQueryString(params: Record<string, string>): string {
        return Object.entries(params)
            .map(
                ([key, value]) =>
                    `${this.urlEncodeValue(key)}=${this.urlEncodeValue(value)}`,
            )
            .join('&');
    }

    /**
     * Encodes a string identically to Java URLEncoder / PHP urlencode.
     */
    private urlEncodeValue(value: string): string {
        return encodeURIComponent(value).replace(/%20/g, '+');
    }

    private sortObject(obj: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .sort(([a], [b]) => a.localeCompare(b)),
        );
    }
}
