import type { Hono } from 'hono';
import type { AppBindings } from '../bindings';
import { chatRoute } from './chat.route';
import { pageRoute } from './page.route';
import { shortUrlRoute } from './shortUrl.route';
import { subRoute } from './sub.route';

export function registerRoutes(app: Hono<AppBindings>): void {
    app.route('/', pageRoute);
    app.route('/', subRoute);
    app.route('/', shortUrlRoute);
    app.route('/', chatRoute);
}

