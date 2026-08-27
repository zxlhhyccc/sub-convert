import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export async function errorHandler(err: Error, c: Context): Promise<Response> {
    if (err instanceof HTTPException) {
        return c.json({ message: err.message }, err.status);
    }

    const message = err?.message || 'Internal Server Error';

    console.error('[error]', err);
    return c.json({ message }, 500);
}
