import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import { randomUUID } from 'crypto';
import { IVectorSearchResult } from '@modules/chatbot/interfaces/vector-search-result.interface';
import { ChatbotEmbedType } from '@modules/chatbot/enums/chatbot.enum';
import {
    ZILLIZ_FIELD_EMBEDDING,
    ZILLIZ_FIELD_ID,
    ZILLIZ_FIELD_METADATA,
    ZILLIZ_FIELD_TEXT,
    ZILLIZ_FIELD_TYPE,
    ZILLIZ_ID_MAX_LENGTH,
    ZILLIZ_INDEX_FIELD,
    ZILLIZ_INDEX_TYPE,
    ZILLIZ_METRIC_TYPE,
    ZILLIZ_TYPE_MAX_LENGTH,
    ZILLIZ_VARCHAR_MAX_LENGTH,
} from '@modules/chatbot/constants/chatbot.constants';

@Injectable()
export class ZillizService implements OnModuleInit {
    private readonly logger = new Logger(ZillizService.name);
    private client: MilvusClient;
    private collectionName: string;
    private dimension: number;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        const uri = this.configService.get<string>('chatbot.zilliz.uri');
        const token = this.configService.get<string>('chatbot.zilliz.token');
        this.collectionName = this.configService.get<string>(
            'chatbot.zilliz.collectionName',
        );
        this.dimension = this.configService.get<number>(
            'chatbot.zilliz.dimension',
        );

        this.client = new MilvusClient({ address: uri, token });
        this.logger.log(`ZillizService connecting to: ${uri}`);

        await this.ensureCollection();
    }

    /**
     * @description Tạo collection nếu chưa tồn tại, sau đó load vào memory để search.
     */
    async ensureCollection(): Promise<void> {
        const exists = await this.client.hasCollection({
            collection_name: this.collectionName,
        });

        if (!exists.value) {
            await this.client.createCollection({
                collection_name: this.collectionName,
                fields: [
                    {
                        name: ZILLIZ_FIELD_ID,
                        data_type: DataType.VarChar,
                        max_length: ZILLIZ_ID_MAX_LENGTH,
                        is_primary_key: true,
                    },
                    {
                        name: ZILLIZ_FIELD_EMBEDDING,
                        data_type: DataType.FloatVector,
                        dim: this.dimension,
                    },
                    {
                        name: ZILLIZ_FIELD_TEXT,
                        data_type: DataType.VarChar,
                        max_length: ZILLIZ_VARCHAR_MAX_LENGTH,
                    },
                    {
                        name: ZILLIZ_FIELD_TYPE,
                        data_type: DataType.VarChar,
                        max_length: ZILLIZ_TYPE_MAX_LENGTH,
                    },
                    {
                        name: ZILLIZ_FIELD_METADATA,
                        data_type: DataType.JSON,
                    },
                ],
            });

            await this.client.createIndex({
                collection_name: this.collectionName,
                field_name: ZILLIZ_INDEX_FIELD,
                index_type: ZILLIZ_INDEX_TYPE,
                metric_type: ZILLIZ_METRIC_TYPE,
            });

            this.logger.log(
                `Created Zilliz collection: ${this.collectionName}`,
            );
        }

        await this.client.loadCollection({
            collection_name: this.collectionName,
        });

        this.logger.log(`Zilliz collection loaded: ${this.collectionName}`);
    }

    /**
     * @description Chèn một vector embedding kèm metadata vào Zilliz.
     * Trả về ID của bản ghi vừa insert.
     */
    async insert(
        embedding: number[],
        text: string,
        type: ChatbotEmbedType,
        metadata: Record<string, any> = {},
    ): Promise<string> {
        const id = randomUUID();

        await this.client.insert({
            collection_name: this.collectionName,
            data: [
                {
                    [ZILLIZ_FIELD_ID]: id,
                    [ZILLIZ_FIELD_EMBEDDING]: embedding,
                    [ZILLIZ_FIELD_TEXT]: text,
                    [ZILLIZ_FIELD_TYPE]: type,
                    [ZILLIZ_FIELD_METADATA]: metadata,
                },
            ],
        });

        return id;
    }

    /**
     * Chèn nhiều vector trong một lần gọi Milvus (giảm round-trip khi sync hàng loạt).
     */
    async insertBatch(
        rows: Array<{
            embedding: number[];
            text: string;
            type: ChatbotEmbedType;
            metadata: Record<string, any>;
        }>,
    ): Promise<string[]> {
        if (!rows.length) {
            return [];
        }

        const ids = rows.map(() => randomUUID());

        await this.client.insert({
            collection_name: this.collectionName,
            data: rows.map((row, i) => ({
                [ZILLIZ_FIELD_ID]: ids[i],
                [ZILLIZ_FIELD_EMBEDDING]: row.embedding,
                [ZILLIZ_FIELD_TEXT]: row.text,
                [ZILLIZ_FIELD_TYPE]: row.type,
                [ZILLIZ_FIELD_METADATA]: row.metadata,
            })),
        });

        return ids;
    }

    /**
     * @description Tìm kiếm các vector gần nhất với embedding đầu vào.
     * Trả về danh sách kết quả kèm score độ tương đồng.
     */
    async search(
        embedding: number[],
        limit: number,
    ): Promise<IVectorSearchResult[]> {
        const results = await this.client.search({
            collection_name: this.collectionName,
            data: [embedding],
            limit,
            output_fields: [
                ZILLIZ_FIELD_TEXT,
                ZILLIZ_FIELD_TYPE,
                ZILLIZ_FIELD_METADATA,
            ],
        });

        return (results.results ?? []).map((hit) => ({
            id: String(hit.id),
            score: hit.score,
            text: hit[ZILLIZ_FIELD_TEXT] as string,
            type: hit[ZILLIZ_FIELD_TYPE] as ChatbotEmbedType,
            metadata: hit[ZILLIZ_FIELD_METADATA] as Record<string, any>,
        }));
    }
}
