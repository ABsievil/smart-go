import { UseInterceptors } from '@nestjs/common';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';

/**
 * Đặt timeout cho một endpoint cụ thể.
 * @param ms Thời gian timeout tính bằng milliseconds
 *
 * @example
 * \@RequestTimeout(5 * 60 * 1000) // 5 phút
 */
export const RequestTimeout = (ms: number) =>
    UseInterceptors(new TimeoutInterceptor(ms));
