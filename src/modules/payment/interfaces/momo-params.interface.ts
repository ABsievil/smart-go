export interface IMomoCreatePaymentParams {
    amount: number;
    orderDescription: string;
    orderType: string;
    txnRef: string;
    ipAddr: string;
    returnUrl: string;
}

/** Query/body callback MoMo — các field số thường là string từ URL. */
export interface IMomoCallbackParams {
    partnerCode: string;
    orderId: string;
    requestId: string;
    amount: number | string;
    orderInfo: string;
    orderType?: string;
    transId?: number | string;
    resultCode: number | string;
    message: string;
    payType?: string;
    responseTime?: number | string;
    extraData?: string;
    signature: string;
    [key: string]: string | number | undefined;
}
