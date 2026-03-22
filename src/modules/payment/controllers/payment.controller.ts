import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@modules/auth/decorators/auth.decorator';
import { PaymentService } from '@modules/payment/services/payment.service';
import { PaymentCreateRequestDto } from '@modules/payment/dtos/request/payment-create.request.dto';
import { PaymentUrlResponseDto } from '@modules/payment/dtos/response/payment-url.response.dto';
import { PaymentResultResponseDto } from '@modules/payment/dtos/response/payment-result.response.dto';
import { IMomoCallbackParams } from '@modules/payment/interfaces/momo-params.interface';
import { IVnpayCallbackParams } from '@modules/payment/interfaces/vnpay-params.interface';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @Post('vnpay/create')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @LanguageResponse({ module: 'payment', successKey: 'create' })
    @ApiOperation({ summary: 'Create a VNPAY payment URL' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Payment URL created successfully',
        type: PaymentUrlResponseDto,
    })
    createPaymentUrl(
        @Body() dto: PaymentCreateRequestDto,
        @Req() request: Request,
    ): PaymentUrlResponseDto {
        const ipAddr =
            (request.headers['x-forwarded-for'] as string) ||
            request.socket.remoteAddress ||
            '127.0.0.1';

        return this.paymentService.createPaymentUrl(dto, ipAddr);
    }

    @Post('momo/create')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @LanguageResponse({ module: 'payment', successKey: 'create' })
    @ApiOperation({ summary: 'Create a MoMo payment URL' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Payment URL created successfully',
        type: PaymentUrlResponseDto,
    })
    async createMomoPaymentUrl(
        @Body() dto: PaymentCreateRequestDto,
        @Req() request: Request,
    ): Promise<PaymentUrlResponseDto> {
        const ipAddr =
            (request.headers['x-forwarded-for'] as string) ||
            request.socket.remoteAddress ||
            '127.0.0.1';

        return this.paymentService.createMomoPaymentUrl(dto, ipAddr);
    }

    @Public()
    @Get('vnpay/return')
    @HttpCode(HttpStatus.OK)
    @LanguageResponse({ module: 'payment', successKey: 'return' })
    @ApiOperation({
        summary: 'VNPAY return URL — displays payment result to customer',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Payment result',
        type: PaymentResultResponseDto,
    })
    handleReturn(
        @Query() params: IVnpayCallbackParams,
    ): PaymentResultResponseDto {
        return this.paymentService.handleReturn(params);
    }

    @Public()
    @Get('vnpay/ipn')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'VNPAY IPN URL — server-to-server payment result notification',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'IPN acknowledgement',
        schema: {
            type: 'object',
            properties: {
                RspCode: { type: 'string', example: '00' },
                Message: { type: 'string', example: 'Confirm Success' },
            },
        },
    })
    handleIpn(@Query() params: IVnpayCallbackParams): {
        RspCode: string;
        Message: string;
    } {
        return this.paymentService.handleIpn(params);
    }

    @Public()
    @Get('momo/return')
    @HttpCode(HttpStatus.OK)
    @LanguageResponse({ module: 'payment', successKey: 'return' })
    @ApiOperation({
        summary: 'MoMo return URL - displays payment result to customer',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Payment result',
        type: PaymentResultResponseDto,
    })
    handleMomoReturn(
        @Query() params: IMomoCallbackParams,
    ): PaymentResultResponseDto {
        return this.paymentService.handleMomoReturn(params);
    }

    @Public()
    @Post('momo/ipn')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'MoMo IPN URL - server-to-server payment result notification',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'IPN acknowledgement',
        schema: {
            type: 'object',
            properties: {
                resultCode: { type: 'number', example: 0 },
                message: { type: 'string', example: 'Confirm Success' },
            },
        },
    })
    handleMomoIpn(@Body() params: IMomoCallbackParams): {
        resultCode: number;
        message: string;
    } {
        return this.paymentService.handleMomoIpn(params);
    }
}
