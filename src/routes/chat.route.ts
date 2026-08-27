import type { AppBindings } from '../bindings';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

interface ChatMessage {
    role: string;
    content: string;
}

interface ChatCompletionResponse {
    choices?: Array<{
        message?: { content?: string };
    }>;
}

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

export const chatRoute = new Hono<AppBindings>();

chatRoute.post('/api/chat', async c => {
    const baseUrl = c.env.ORCA_ROUTER_URL?.replace(/\/+$/, '');
    const token = c.env.ORCA_ROUTER_TOKEN;
    const model = c.env.ORCA_ROUTER_MODEL;

    if (!baseUrl || !token || !model) {
        throw new HTTPException(503, { message: '未配置 AI 服务' });
    }

    const payload = await c.req.json<{ messages?: unknown }>().catch(() => ({ messages: undefined }));
    const messages = normalizeMessages(payload.messages);
    if (messages.length === 0) {
        throw new HTTPException(400, { message: '消息不能为空' });
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages })
    });

    if (!response.ok) {
        throw new HTTPException(502, { message: 'AI 服务请求失败' });
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new HTTPException(502, { message: 'AI 服务返回为空' });
    }

    return c.json({ data: { content } });
});

function normalizeMessages(raw: unknown): ChatMessage[] {
    if (!Array.isArray(raw)) return [];

    const messages: ChatMessage[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const role = (item as ChatMessage).role;
        const content = (item as ChatMessage).content;
        if (!ALLOWED_ROLES.has(role) || typeof content !== 'string') continue;
        const text = content.trim();
        if (!text) continue;
        messages.push({ role, content: text.slice(0, 8000) });
    }

    return messages.slice(-20);
}
