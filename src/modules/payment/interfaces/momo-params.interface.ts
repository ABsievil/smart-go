export interface IMomoCreatePaymentParams {
    amount: number;
    orderDescription: string;
    orderType: string;
    txnRef: string;
    ipAddr: string;
}

export interface IMomoCallbackParams {
    partnerCode: string;
    orderId: string;
    requestId: string;
    amount: number;
    orderInfo: string;
    orderType?: string;
    transId?: number;
    resultCode: number;
    message: string;
    payType?: string;
    responseTime?: number;
    extraData?: string;
    signature: string;
    [key: string]: string | number | undefined;
}
