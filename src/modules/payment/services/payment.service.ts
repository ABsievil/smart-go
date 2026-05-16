import { Injectable } from '@nestjs/common';
import { MomoService } from '@modules/payment/services/momo.service';
import { PaymentRedirectService } from '@modules/payment/services/payment-redirect.service';
import { VnpayService } from '@modules/payment/services/vnpay.service';
import { PaymentCreateRequestDto } from '@modules/payment/dtos/request/payment-create.request.dto';
import { PaymentClientPlatform } from '@modules/payment/enums/payment.enum';
import { PaymentUrlResponseDto } from '@modules/payment/dtos/response/payment-url.response.dto';
import { PaymentResultResponseDto } from '@modules/payment/dtos/response/payment-result.response.dto';
import { IMomoCallbackParams } from '@modules/payment/interfaces/momo-params.interface';
import { IVnpayCallbackParams } from '@modules/payment/interfaces/vnpay-params.interface';
import {
    VnpayIpnRspCode,
    VnpayResponseCode,
} from '@modules/payment/enums/payment.enum';

@Injectable()
export class PaymentService {
    constructor(
        private readonly vnpayService: VnpayService,
        private readonly momoService: MomoService,
        private readonly paymentRedirectService: PaymentRedirectService,
    ) {}

    createPaymentUrl(
        dto: PaymentCreateRequestDto,
        ipAddr: string,
    ): PaymentUrlResponseDto {
        const txnRef = this.generateTxnRef();

        const returnUrl = this.paymentRedirectService.getGatewayReturnUrl(
            'vnpay',
            dto.platform,
        );

        const paymentUrl = this.vnpayService.createPaymentUrl({
            amount: dto.amount,
            orderDescription: dto.orderDescription,
            orderType: dto.orderType,
            txnRef,
            ipAddr,
            returnUrl,
            bankCode: dto.bankCode,
            locale: dto.locale,
        });

        return { paymentUrl, txnRef };
    }

    async createMomoPaymentUrl(
        dto: PaymentCreateRequestDto,
        ipAddr: string,
    ): Promise<PaymentUrlResponseDto> {
        const txnRef = this.generateTxnRef();
        const returnUrl = this.paymentRedirectService.getGatewayReturnUrl(
            'momo',
            dto.platform,
        );

        const paymentUrl = await this.momoService.createPaymentUrl({
            amount: dto.amount,
            orderDescription: dto.orderDescription,
            orderType: dto.orderType,
            txnRef,
            ipAddr,
            returnUrl,
        });

        return { paymentUrl, txnRef };
    }

    buildClientRedirectUrl(
        gateway: 'vnpay' | 'momo',
        platform: PaymentClientPlatform,
        result: PaymentResultResponseDto,
    ): string {
        return this.paymentRedirectService.buildClientRedirectUrl(
            gateway,
            platform,
            result,
        );
    }

    handleReturn(params: IVnpayCallbackParams): PaymentResultResponseDto {
        const isValid = this.vnpayService.verifySignature(params);

        if (!isValid) {
            return this.buildResult(params, false);
        }

        const success = params.vnp_ResponseCode === VnpayResponseCode.SUCCESS;
        return this.buildResult(params, success);
    }

    handleIpn(params: IVnpayCallbackParams): {
        RspCode: string;
        Message: string;
    } {
        const isValid = this.vnpayService.verifySignature(params);

        if (!isValid) {
            return {
                RspCode: VnpayIpnRspCode.INVALID_SIGNATURE,
                Message: 'Invalid signature',
            };
        }

        /**
         * Extension point: query your database by params.vnp_TxnRef,
         * verify the amount, check for duplicate IPN, then update order status.
         * Return VnpayIpnRspCode.ORDER_NOT_FOUND, INVALID_AMOUNT, or
         * ORDER_ALREADY_CONFIRMED accordingly.
         */

        if (params.vnp_ResponseCode !== VnpayResponseCode.SUCCESS) {
            return {
                RspCode: VnpayIpnRspCode.SUCCESS,
                Message: 'Confirm Success',
            };
        }

        return {
            RspCode: VnpayIpnRspCode.SUCCESS,
            Message: 'Confirm Success',
        };
    }

    handleMomoReturn(params: IMomoCallbackParams): PaymentResultResponseDto {
        const isValid = this.momoService.verifySignature(params);
        const success = isValid && params.resultCode === 0;

        return {
            success,
            responseCode: String(params.resultCode),
            txnRef: params.orderId,
            amount: Number(params.amount),
            bankCode: params.payType,
            transactionNo:
                params.transId !== undefined
                    ? String(params.transId)
                    : undefined,
            orderInfo: params.orderInfo,
            payDate:
                params.responseTime !== undefined
                    ? String(params.responseTime)
                    : undefined,
        };
    }

    handleMomoIpn(params: IMomoCallbackParams): {
        resultCode: number;
        message: string;
    } {
        const isValid = this.momoService.verifySignature(params);

        if (!isValid) {
            return {
                resultCode: 97,
                message: 'Invalid signature',
            };
        }

        return {
            resultCode: 0,
            message: 'Confirm Success',
        };
    }

    private buildResult(
        params: IVnpayCallbackParams,
        success: boolean,
    ): PaymentResultResponseDto {
        return {
            success,
            responseCode: params.vnp_ResponseCode,
            txnRef: params.vnp_TxnRef,
            amount: params.vnp_Amount
                ? Number(params.vnp_Amount) / 100
                : undefined,
            bankCode: params.vnp_BankCode,
            transactionNo: params.vnp_TransactionNo,
            orderInfo: params.vnp_OrderInfo,
            payDate: params.vnp_PayDate,
        };
    }

    /**
     * Generates a unique transaction reference using timestamp + random suffix.
     * Must be unique per day per VNPAY requirement.
     */
    private generateTxnRef(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${timestamp}${random}`;
    }
}
