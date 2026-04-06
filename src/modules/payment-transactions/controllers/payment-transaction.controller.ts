import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Put,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { OrderDirection } from '@common/database/enums/order-direction.enum';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { CurrentUser } from '@modules/auth/decorators/auth.decorator';
import { PaymentTransactionService } from '@modules/payment-transactions/services/payment-transaction.service';
import { PaymentTransactionUpdateRequestDto } from '@modules/payment-transactions/dtos/request/payment-transaction-update.request.dto';
import { PaymentTransactionGetResponseDto } from '@modules/payment-transactions/dtos/response/payment-transaction-get.response.dto';
import { PaymentTransactionListResponseDto } from '@modules/payment-transactions/dtos/response/payment-transaction-list.response.dto';
import {
    PaymentGateway,
    PaymentTransactionStatus,
} from '@modules/payment-transactions/enums/payment-transaction.enum';

@ApiTags('Payment transactions')
@Controller('payment-transactions')
export class PaymentTransactionController {
    constructor(
        private readonly paymentTransactionService: PaymentTransactionService,
    ) {}

    @Get()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'payment-transactions',
        successKey: 'findAll',
    })
    @ApiOperation({ summary: 'List payment transactions for current user' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description:
            'Search in orderDescription / txnRef (searchFields or default fields)',
    })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        type: String,
        example: 'createdAt',
    })
    @ApiQuery({
        name: 'orderDirection',
        required: false,
        schema: {
            type: 'string',
            enum: Object.values(OrderDirection),
        },
    })
    @ApiQuery({
        name: 'searchFields',
        required: false,
        type: String,
        example: 'orderDescription,txnRef',
    })
    @ApiQuery({
        name: 'gateway',
        required: false,
        schema: {
            type: 'string',
            enum: Object.values(PaymentGateway),
        },
    })
    @ApiQuery({
        name: 'status',
        required: false,
        schema: {
            type: 'string',
            enum: Object.values(PaymentTransactionStatus),
        },
    })
    @ApiResponse({
        status: 200,
        description: 'List of payment transactions',
        type: PaymentTransactionListResponseDto,
    })
    async findAll(
        @CurrentUser('_id') userId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search?: string,
        @Query('orderBy') orderBy?: string,
        @Query('orderDirection') orderDirectionRaw?: string,
        @Query('searchFields') searchFieldsRaw?: string,
        @Query('gateway') gateway?: string,
        @Query('status') status?: string,
    ): Promise<PaymentTransactionListResponseDto> {
        const searchTrimmed = search?.trim();
        const searchFields =
            searchFieldsRaw
                ?.split(',')
                .map((s) => s.trim())
                .filter(Boolean) ??
            (searchTrimmed ? ['orderDescription', 'txnRef'] : undefined);

        const orderDirection =
            orderDirectionRaw?.toLowerCase() === OrderDirection.DESC
                ? OrderDirection.DESC
                : OrderDirection.ASC;

        const gatewayTrimmed = gateway?.trim();
        const statusTrimmed = status?.trim();

        const filter: Record<string, unknown> = { userId };
        if (
            gatewayTrimmed &&
            (Object.values(PaymentGateway) as string[]).includes(gatewayTrimmed)
        ) {
            filter.gateway = gatewayTrimmed as PaymentGateway;
        }
        if (
            statusTrimmed &&
            (Object.values(PaymentTransactionStatus) as string[]).includes(
                statusTrimmed,
            )
        ) {
            filter.status = statusTrimmed as PaymentTransactionStatus;
        }

        const { data, total } = await this.paymentTransactionService.findAll(
            filter as Record<string, any>,
            page,
            limit,
            orderBy?.trim() || undefined,
            orderDirection,
            searchTrimmed,
            searchFields,
        );

        return {
            total,
            page,
            limit,
            data: this.paymentTransactionService.mapList(data),
        };
    }

    @Get(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'payment-transactions',
        successKey: 'findOne',
    })
    @ApiOperation({ summary: 'Get payment transaction by ID' })
    @ApiResponse({
        status: 200,
        description: 'Transaction found',
        type: PaymentTransactionGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @HttpCode(HttpStatus.OK)
    async findOne(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
    ): Promise<PaymentTransactionGetResponseDto> {
        const doc = await this.paymentTransactionService.findOne(id, {
            userId,
        });
        return this.paymentTransactionService.mapGet(doc);
    }

    @Put(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'payment-transactions',
        successKey: 'update',
    })
    @ApiOperation({
        summary:
            'Cập nhật kết quả thanh toán (sau khi FE nhận redirect từ cổng; bản ghi đã tạo qua payments/create)',
    })
    @ApiResponse({
        status: 200,
        description: 'Transaction updated',
        type: PaymentTransactionGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @HttpCode(HttpStatus.OK)
    async update(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
        @Body() updateDto: PaymentTransactionUpdateRequestDto,
    ): Promise<PaymentTransactionGetResponseDto> {
        const updated = await this.paymentTransactionService.update(
            id,
            updateDto,
            { userId },
        );
        return this.paymentTransactionService.mapGet(updated);
    }
}
