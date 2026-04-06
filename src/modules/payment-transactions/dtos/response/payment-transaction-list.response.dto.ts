import { BaseResponseListDto } from '@common/dtos/base-response.list.dto';
import { PaymentTransactionGetResponseDto } from '@modules/payment-transactions/dtos/response/payment-transaction-get.response.dto';

export class PaymentTransactionListResponseDto extends BaseResponseListDto<PaymentTransactionGetResponseDto> {}
