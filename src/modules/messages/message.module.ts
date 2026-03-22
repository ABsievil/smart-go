import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageService } from '@modules/messages/services/message.service';
import { MessageRepository } from '@modules/messages/repositories/repository/message.repository';
import {
    MessageEntity,
    MessageSchema,
} from '@modules/messages/repositories/entities/message.entity';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: MessageEntity.name,
                    schema: MessageSchema,
                },
            ],
            DB_CONNECTION_NAME,
        ),
    ],
    providers: [MessageRepository, MessageService],
    exports: [MessageService, MessageRepository],
})
export class MessageModule {}
