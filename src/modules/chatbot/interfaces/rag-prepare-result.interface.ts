import { ChatHistoryItemDto } from '@modules/chatbot/dtos/request/chat-history-item.request.dto';
import { RagPrepareKind } from '@modules/chatbot/enums/chatbot.enum';
import { ICachedReply } from '@modules/chatbot/interfaces/cached-reply.interface';
import { IVectorSearchResult } from '@modules/chatbot/interfaces/vector-search-result.interface';

export type IRagPrepareResult =
    | {
          kind: RagPrepareKind.REPLY_CACHE;
          history: ChatHistoryItemDto[];
          cached: ICachedReply;
      }
    | {
          kind: RagPrepareKind.RAG;
          history: ChatHistoryItemDto[];
          contextDocs: IVectorSearchResult[];
      };
