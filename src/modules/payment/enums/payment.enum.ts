export enum PaymentOrderType {
    TOPUP = 'topup',
    BILLPAYMENT = 'billpayment',
    FASHION = 'fashion',
    FOOD = 'food',
    TRAVEL = 'travel',
    OTHER = 'other',
}

export enum VnpayResponseCode {
    SUCCESS = '00',
    SUSPECTED_FRAUD = '07',
    INTERNET_BANKING_NOT_REGISTERED = '09',
    WRONG_AUTH_MORE_THAN_3_TIMES = '10',
    PAYMENT_TIMEOUT = '11',
    CARD_LOCKED = '12',
    WRONG_OTP = '13',
    TRANSACTION_CANCELLED = '24',
    INSUFFICIENT_BALANCE = '51',
    DAILY_LIMIT_EXCEEDED = '65',
    BANK_MAINTENANCE = '75',
    WRONG_PIN_TOO_MANY_TIMES = '79',
    OTHER_ERROR = '99',
}

export enum VnpayTransactionStatus {
    SUCCESS = '00',
    INCOMPLETE = '01',
    ERROR = '02',
    REVERSED = '04',
    VNPAY_PROCESSING_REFUND = '05',
    VNPAY_SENT_REFUND_TO_BANK = '06',
    SUSPECTED_FRAUD = '07',
    REFUND_REJECTED = '09',
}

export enum VnpayIpnRspCode {
    SUCCESS = '00',
    ORDER_ALREADY_CONFIRMED = '02',
    INVALID_AMOUNT = '04',
    ORDER_NOT_FOUND = '01',
    INVALID_SIGNATURE = '97',
    UNKNOWN_ERROR = '99',
}
