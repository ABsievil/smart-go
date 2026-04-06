export enum PaymentGateway {
    VNPAY = 'vnpay',
    MOMO = 'momo',
}

export enum PaymentTransactionStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
    INVALID_SIGNATURE = 'invalid_signature',
}
