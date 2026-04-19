import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';

export interface IChatMessage {
    role: ChatMessageRole;
    content: string;
}

/**
 * Một sự kiện trong luồng streaming chat — emit dần bởi `chatStream()`.
 *  - `meta`  : phát MỘT lần ngay khi biết metadata (contextCount, cached flag).
 *  - `token` : mỗi mẩu text (delta) do LLM sinh ra.
 */
export type ChatStreamEvent =
    | { type: 'meta'; contextCount: number; cached: boolean }
    | { type: 'token'; content: string };
