import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseEnumPipe,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser, Public } from '@modules/auth/decorators/auth.decorator';
import { PaymentService } from '@modules/payment/services/payment.service';
import { PaymentTransactionService } from '@modules/payment-transactions/services/payment-transaction.service';
import { PaymentCreateRequestDto } from '@modules/payment/dtos/request/payment-create.request.dto';
import {
    PaymentUrlCreateResponse,
    PaymentUrlResponseDto,
} from '@modules/payment/dtos/response/payment-url.response.dto';
import { IMomoCallbackParams } from '@modules/payment/interfaces/momo-params.interface';
import { IVnpayCallbackParams } from '@modules/payment/interfaces/vnpay-params.interface';
import { PaymentClientPlatform } from '@modules/payment/enums/payment.enum';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly paymentTransactionService: PaymentTransactionService,
    ) {}

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
    async createPaymentUrl(
        @CurrentUser('_id') userId: string,
        @Body() dto: PaymentCreateRequestDto,
        @Req() request: Request,
    ): Promise<PaymentUrlCreateResponse> {
        const ipAddr =
            (request.headers['x-forwarded-for'] as string) ||
            request.socket.remoteAddress ||
            '127.0.0.1';

        const result = this.paymentService.createPaymentUrl(dto, ipAddr);
        const paymentTransactionId =
            await this.paymentTransactionService.recordPendingVnpay(
                userId,
                dto,
                result.txnRef,
                ipAddr,
            );
        return { ...result, paymentTransactionId };
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
        @CurrentUser('_id') userId: string,
        @Body() dto: PaymentCreateRequestDto,
        @Req() request: Request,
    ): Promise<PaymentUrlCreateResponse> {
        const ipAddr =
            (request.headers['x-forwarded-for'] as string) ||
            request.socket.remoteAddress ||
            '127.0.0.1';

        const result = await this.paymentService.createMomoPaymentUrl(
            dto,
            ipAddr,
        );
        const paymentTransactionId =
            await this.paymentTransactionService.recordPendingMomo(
                userId,
                dto,
                result.txnRef,
                ipAddr,
            );
        return { ...result, paymentTransactionId };
    }

    @Public()
    @Get('vnpay/return/:platform')
    @ApiOperation({
        summary:
            'VNPAY return — verify signature, then redirect to web or app URL',
    })
    @ApiParam({
        name: 'platform',
        enum: Object.values(PaymentClientPlatform),
        enumName: 'PaymentClientPlatform',
    })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description: 'Redirect to client payment result page',
    })
    handleReturn(
        @Param(
            'platform',
            new ParseEnumPipe(PaymentClientPlatform),
        )
        platform: PaymentClientPlatform,
        @Query() params: IVnpayCallbackParams,
        @Res() response: Response,
    ): void {
        const result = this.paymentService.handleReturn(params);
        const redirectUrl = this.paymentService.buildClientRedirectUrl(
            'vnpay',
            platform,
            result,
        );
        response.redirect(redirectUrl);
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
    @Get('momo/return/:platform')
    @ApiOperation({
        summary:
            'MoMo return — verify signature, then redirect to web or app URL',
    })
    @ApiParam({
        name: 'platform',
        enum: Object.values(PaymentClientPlatform),
        enumName: 'PaymentClientPlatform',
    })
    @ApiResponse({
        status: HttpStatus.FOUND,
        description: 'Redirect to client payment result page',
    })
    handleMomoReturn(
        @Param(
            'platform',
            new ParseEnumPipe(PaymentClientPlatform),
        )
        platform: PaymentClientPlatform,
        @Query() params: IMomoCallbackParams,
        @Res() response: Response,
    ): void {
        const result = this.paymentService.handleMomoReturn(params);
        const redirectUrl = this.paymentService.buildClientRedirectUrl(
            'momo',
            platform,
            result,
        );
        response.redirect(redirectUrl);
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
