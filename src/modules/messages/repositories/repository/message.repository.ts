import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    MessageEntity,
    MessageDoc,
} from '@modules/messages/repositories/entities/message.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class MessageRepository extends DBRepositoryBase<MessageEntity, MessageDoc> {
    constructor(
        @InjectDatabaseModel(MessageEntity.name)
        private readonly messageModel: Model<MessageEntity>,
    ) {
        super(messageModel);
    }
}
