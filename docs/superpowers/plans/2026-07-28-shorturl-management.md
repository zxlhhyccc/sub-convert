# Short URL Management Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a themed `/shortUrl` management page (create + paginated list + copy/delete) with a reusable `<sub-table>` Web Component, reusing existing short URL APIs.

**Architecture:** Server-rendered HTML pages (same pattern as `showPage`) with Shadow DOM Web Components. New page lives in `shortUrl.page.ts`; `page.ts` re-exports it and gains a header nav link. List UI is a new `<sub-table>`; pagination stays in page script.

**Tech Stack:** Hono, TypeScript, Web Components (inline `<script>` factories), existing `theme` / `style` / `layout` CSS variables.

## Global Constraints

- Match existing component factory pattern: `export function SubX(): string` returning a `<script>` that `customElements.define(...)`.
- Reuse CSS variables from the convert page theme (`--border-color`, `--text-primary`, `--background`, `--primary-color`, etc.).
- Do **not** change backend APIs under `src/routes/shortUrl.route.ts` / `UrlController`.
- Do **not** add auth, edit, or search-by-code.
- No frontend unit test harness exists; verify with `pnpm lint` (or `npm run lint`) plus manual browser checks listed in each task.
- Copy strings must be Chinese as specified in the design spec.

## File Structure

| File | Responsibility |
|------|----------------|
| `src/page/components/sub-table.ts` | `<sub-table>` Web Component factory |
| `src/page/components/index.ts` | Export `SubTable` |
| `src/page/shortUrl.page.ts` | Full short URL management page |
| `src/page/page.ts` | Convert page nav link; re-export `showShortUrlPage` |
| `src/page/style/layout.ts` | Header right-side nav + actions layout |

---

### Task 1: `<sub-table>` Web Component

**Files:**
- Create: `src/page/components/sub-table.ts`
- Modify: `src/page/components/index.ts`

**Interfaces:**
- Consumes: existing CSS variables; no other components
- Produces: `SubTable(): string` — registers `sub-table` with attributes `columns`, `data`, `row-key`, `empty-text`, `loading`, `actions` and event `table:action`

- [ ] **Step 1: Create `sub-table.ts`**

Create `src/page/components/sub-table.ts` with this content:

```typescript
export function SubTable(): string {
    return `
    <script>
        class SubTable extends HTMLElement {
            static get observedAttributes() {
                return ['columns', 'data', 'row-key', 'empty-text', 'loading', 'actions'];
            }

            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
                this.state = {
                    columns: [],
                    data: [],
                    actions: [],
                    rowKey: 'id',
                    emptyText: '暂无数据',
                    loading: false
                };
                this.#render();
            }

            #parseJson(value, fallback) {
                if (!value) return fallback;
                try {
                    return JSON.parse(value);
                } catch (e) {
                    console.error('Invalid JSON for sub-table:', e);
                    return fallback;
                }
            }

            #syncFromAttributes() {
                this.state.columns = this.#parseJson(this.getAttribute('columns'), []);
                this.state.data = this.#parseJson(this.getAttribute('data'), []);
                this.state.actions = this.#parseJson(this.getAttribute('actions'), []);
                this.state.rowKey = this.getAttribute('row-key') || 'id';
                this.state.emptyText = this.getAttribute('empty-text') || '暂无数据';
                this.state.loading = this.hasAttribute('loading');
            }

            connectedCallback() {
                this.#syncFromAttributes();
                this.#updateBody();
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (oldValue === newValue) return;
                this.#syncFromAttributes();
                this.#updateBody();
            }

            #injectStyle() {
                const style = document.createElement('style');
                style.textContent = \`
                    :host {
                        display: block;
                        width: 100%;
                        font-size: 14px;
                        color: var(--text-primary);
                    }
                    .sub-table {
                        width: 100%;
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius);
                        overflow: hidden;
                        background: var(--background);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    thead th {
                        text-align: left;
                        padding: 10px 12px;
                        background: var(--background-secondary, var(--background));
                        border-bottom: 1px solid var(--border-color);
                        color: var(--text-secondary, var(--text-primary));
                        font-weight: 600;
                        white-space: nowrap;
                    }
                    tbody td {
                        padding: 10px 12px;
                        border-bottom: 1px solid var(--border-color);
                        color: var(--text-primary);
                        vertical-align: middle;
                    }
                    tbody tr:last-child td {
                        border-bottom: none;
                    }
                    tbody tr:hover td {
                        background: var(--background-secondary, rgba(127,127,127,0.08));
                    }
                    .ellipsis {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                    .action-btn {
                        appearance: none;
                        background: transparent;
                        border: none;
                        padding: 0;
                        color: var(--primary-color);
                        cursor: pointer;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                    .action-btn:hover {
                        opacity: 0.8;
                    }
                    .action-btn.danger {
                        color: #ff4d4f;
                    }
                    .empty,
                    .loading {
                        padding: 28px 12px;
                        text-align: center;
                        color: var(--text-secondary, var(--text-disabled));
                    }
                \`;
                this.shadowRoot.appendChild(style);
            }

            #injectElement() {
                const root = document.createElement('div');
                root.className = 'sub-table';
                root.innerHTML = \`
                    <table>
                        <thead><tr></tr></thead>
                        <tbody></tbody>
                    </table>
                    <div class="empty" hidden></div>
                    <div class="loading" hidden>加载中...</div>
                \`;
                this.shadowRoot.appendChild(root);
                root.addEventListener('click', e => {
                    const btn = e.target.closest('[data-action]');
                    if (!btn) return;
                    const action = btn.getAttribute('data-action');
                    const rowKey = btn.getAttribute('data-row-key');
                    const row = this.state.data.find(item => String(item[this.state.rowKey]) === String(rowKey));
                    if (!row) return;
                    this.dispatchEvent(
                        new CustomEvent('table:action', {
                            detail: { action, row, rowKey },
                            bubbles: true
                        })
                    );
                });
            }

            #updateBody() {
                const table = this.shadowRoot.querySelector('table');
                const theadRow = this.shadowRoot.querySelector('thead tr');
                const tbody = this.shadowRoot.querySelector('tbody');
                const empty = this.shadowRoot.querySelector('.empty');
                const loading = this.shadowRoot.querySelector('.loading');
                if (!table || !theadRow || !tbody || !empty || !loading) return;

                theadRow.innerHTML = '';
                this.state.columns.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = col.title || '';
                    if (col.width) th.style.width = col.width;
                    theadRow.appendChild(th);
                });

                tbody.innerHTML = '';
                if (this.state.loading) {
                    table.hidden = true;
                    empty.hidden = true;
                    loading.hidden = false;
                    return;
                }

                loading.hidden = true;
                if (!this.state.data.length) {
                    table.hidden = true;
                    empty.hidden = false;
                    empty.textContent = this.state.emptyText;
                    return;
                }

                table.hidden = false;
                empty.hidden = true;

                this.state.data.forEach(row => {
                    const tr = document.createElement('tr');
                    const rowKey = row[this.state.rowKey];
                    this.state.columns.forEach(col => {
                        const td = document.createElement('td');
                        if (col.type === 'actions') {
                            const wrap = document.createElement('div');
                            wrap.className = 'actions';
                            this.state.actions.forEach(action => {
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = action.danger ? 'action-btn danger' : 'action-btn';
                                btn.textContent = action.label || action.key;
                                btn.setAttribute('data-action', action.key);
                                btn.setAttribute('data-row-key', String(rowKey));
                                wrap.appendChild(btn);
                            });
                            td.appendChild(wrap);
                        } else {
                            const text = row[col.key] == null ? '' : String(row[col.key]);
                            td.textContent = text;
                            td.title = text;
                            if (col.ellipsis) td.classList.add('ellipsis');
                        }
                        if (col.width) td.style.width = col.width;
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            }

            #render() {
                this.#injectStyle();
                this.#injectElement();
            }
        }
        customElements.define('sub-table', SubTable);
    </script>
    `;
}
```

- [ ] **Step 2: Export from `components/index.ts`**

Update `src/page/components/index.ts` to:

```typescript
import { SubButton } from './sub-button';
import { SubCheckbox } from './sub-checkbox';
import { SubForm } from './sub-form';
import { SubFormItem } from './sub-form-item';
import { SubInput } from './sub-input';
import { SubMessage } from './sub-message';
import { SubMultiSelect } from './sub-multi-select';
import { SubSelect } from './sub-select';
import { SubTable } from './sub-table';
import { SubTextarea } from './sub-textarea';

export {
    SubButton,
    SubCheckbox,
    SubForm,
    SubFormItem,
    SubInput,
    SubMessage,
    SubMultiSelect,
    SubSelect,
    SubTable,
    SubTextarea
};
```

- [ ] **Step 3: Lint the new component**

Run: `pnpm lint` (or `npm run lint` if pnpm unavailable)

Expected: no new errors in `src/page/components/sub-table.ts` / `index.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/page/components/sub-table.ts src/page/components/index.ts
git commit -m "$(cat <<'EOF'
feat(page): add sub-table web component

EOF
)"
```

---

### Task 2: Header nav layout styles

**Files:**
- Modify: `src/page/style/layout.ts`

**Interfaces:**
- Consumes: existing header flex layout
- Produces: `.header__right`, `.header__nav` styles used by both pages

- [ ] **Step 1: Add header right-side styles**

In `src/page/style/layout.ts`, after the `.header__title` block (before `.header__theme`), insert:

```css
main > header > .header__right {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 25px;
    justify-content: flex-end;
}

main > header > .header__right > .header__nav {
    color: var(--text-secondary, var(--text-primary));
    text-decoration: none;
    font-size: 13px;
    white-space: nowrap;
    transition: var(--transition);
}

main > header > .header__right > .header__nav:hover {
    color: var(--primary-color);
}
```

Also update the theme button selector so it still works when nested under `.header__right`. Change:

```css
main > header > .header__theme {
```

to:

```css
main > header .header__theme {
```

And similarly for:

```css
main > header > .header__theme:hover {
```

→

```css
main > header .header__theme:hover {
```

And:

```css
main > header > .header__theme::before {
```

→

```css
main > header .header__theme::before {
```

Keep `:root[theme='dark']` / `:root:not([theme='dark'])` theme icon rules, but change `main > header > .header__theme::before` to `main > header .header__theme::before` in those selectors too.

Optionally add list section spacing used by the short URL page — after `main > section` block, append:

```css
main > section.short-url-list {
    margin-top: 8px;
    padding-bottom: 20px;
}

.short-url-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
    color: var(--text-secondary, var(--text-primary));
    font-size: 13px;
}

.short-url-pagination button {
    appearance: none;
    border: 1px solid var(--border-color);
    background: var(--background);
    color: var(--text-primary);
    border-radius: var(--radius);
    padding: 4px 12px;
    height: 32px;
    cursor: pointer;
    transition: var(--transition);
}

.short-url-pagination button:hover:not(:disabled) {
    color: var(--primary-color);
    border-color: var(--primary-color);
}

.short-url-pagination button:disabled {
    cursor: not-allowed;
    color: var(--text-disabled);
    background: var(--background-disabled);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/page/style/layout.ts
git commit -m "$(cat <<'EOF'
style(page): support header nav and short-url list layout

EOF
)"
```

---

### Task 3: Short URL management page

**Files:**
- Create: `src/page/shortUrl.page.ts`
- Modify: `src/page/page.ts` (replace stub with re-export; add convert-page nav)

**Interfaces:**
- Consumes: `SubTable`, `SubForm`, `SubFormItem`, `SubTextarea`, `SubButton`, `SubMessage`, `theme`, `style`, `layout`, `env.SHORT_URL_ENABLED`
- Produces: `showShortUrlPage(request: Request, env: Env): Response`

- [ ] **Step 1: Create `src/page/shortUrl.page.ts`**

```typescript
import { SubButton, SubForm, SubFormItem, SubMessage, SubTable, SubTextarea } from './components';
import { theme } from './script/theme';
import { layout } from './style/layout';
import { style } from './style/style';

export function showShortUrlPage(_request: Request, env: Env): Response {
    const hasDBConfig = env.SHORT_URL_ENABLED === true;

    const columns = [
        { key: 'short_url', title: '短链' },
        { key: 'long_url', title: '长链', ellipsis: true },
        { type: 'actions', title: '操作', width: '120px' }
    ];

    const actions = [
        { key: 'copy', label: '复制' },
        { key: 'delete', label: '删除', danger: true }
    ];

    const html = `
    <!DOCTYPE html>
        <html lang="zh-CN" theme="dark">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>短链管理</title>
                ${style()}
                ${layout()}
                <style>
                    .sub-form-item__actions {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 20px;
                        margin-top: 8px;
                        padding-right: 100px;
                    }
                </style>
            </head>
            <body>
                ${theme()}

                <main>
                    <header>
                        <span class="header__icon">
                            <svg
                                t="1735896323200"
                                class="icon"
                                viewBox="0 0 1024 1024"
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                p-id="1626"
                            >
                                <path
                                    d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 363.52 938.666667c23.466667 4.266667 32-9.813333 32-22.186667v-78.08c-130.56 27.733333-158.293333-61.44-158.293333-61.44a122.026667 122.026667 0 0 0-52.053334-67.413333c-42.666667-28.16 3.413333-27.733333 3.413334-27.733334a98.56 98.56 0 0 1 71.68 47.36 101.12 101.12 0 0 0 136.533333 37.973334 99.413333 99.413333 0 0 1 29.866667-61.44c-104.106667-11.52-213.333333-50.773333-213.333334-226.986667a177.066667 177.066667 0 0 1 47.36-124.16 161.28 161.28 0 0 1 4.693334-121.173333s39.68-12.373333 128 46.933333a455.68 455.68 0 0 1 234.666666 0c89.6-59.306667 128-46.933333 128-46.933333a161.28 161.28 0 0 1 4.693334 121.173333A177.066667 177.066667 0 0 1 810.666667 477.866667c0 176.64-110.08 215.466667-213.333334 226.986666a106.666667 106.666667 0 0 1 32 85.333334v125.866666c0 14.933333 8.533333 26.88 32 22.186667A460.8 460.8 0 0 0 981.333333 502.186667 464.64 464.64 0 0 0 512 42.666667"
                                    fill="#231F20"
                                    p-id="1627"
                                ></path>
                            </svg>
                        </span>

                        <span class="header__title">短链管理</span>

                        <div class="header__right">
                            <a class="header__nav" href="/">订阅转换</a>
                            <button class="header__theme" type="button"></button>
                        </div>
                    </header>

                    <section>
                        <sub-form id="short-url-form" label-width="100px">
                            <sub-form-item label="长链地址">
                                <sub-textarea
                                    key="long_url"
                                    placeholder="输入需要缩短的完整 URL"
                                    rows="3"
                                    ${!hasDBConfig ? 'disabled' : ''}
                                ></sub-textarea>
                            </sub-form-item>
                            <sub-form-item>
                                <div class="sub-form-item__actions">
                                    <sub-button id="create-short-url-btn" type="default" ${!hasDBConfig ? 'disabled' : ''}>
                                        生成短链
                                    </sub-button>
                                </div>
                            </sub-form-item>
                        </sub-form>
                    </section>

                    <section class="short-url-list">
                        <sub-table
                            id="short-url-table"
                            row-key="short_code"
                            columns='${JSON.stringify(columns)}'
                            actions='${JSON.stringify(actions)}'
                            data="[]"
                            empty-text="${hasDBConfig ? '暂无数据' : '短链服务未启用'}"
                        ></sub-table>
                        <div class="short-url-pagination" id="short-url-pagination" ${!hasDBConfig ? 'hidden' : ''}>
                            <span id="pagination-total">共 0 条</span>
                            <button type="button" id="pagination-prev" disabled>上一页</button>
                            <span id="pagination-page">第 1/1 页</span>
                            <button type="button" id="pagination-next" disabled>下一页</button>
                        </div>
                    </section>
                </main>

                ${SubTextarea()}
                ${SubFormItem()}
                ${SubForm()}
                ${SubButton()}
                ${SubTable()}
                ${SubMessage()}

                <script>
                    class ShortUrlManager {
                        #enabled = ${hasDBConfig};
                        #page = 1;
                        #pageSize = 10;
                        #total = 0;
                        #model = { long_url: '' };

                        #form = document.querySelector('#short-url-form');
                        #createBtn = document.querySelector('#create-short-url-btn');
                        #table = document.querySelector('#short-url-table');
                        #prevBtn = document.querySelector('#pagination-prev');
                        #nextBtn = document.querySelector('#pagination-next');
                        #totalEl = document.querySelector('#pagination-total');
                        #pageEl = document.querySelector('#pagination-page');
                        #headerIcon = document.querySelector('.header__icon');

                        constructor() {
                            this.#bindEvents();
                            if (this.#enabled) {
                                this.#loadList();
                            }
                        }

                        #bindEvents() {
                            this.#headerIcon?.addEventListener('click', () => {
                                window.open('https://github.com/jwyGithub/sub-convert');
                            });

                            this.#form?.addEventListener('form:change', e => {
                                this.#model[e.detail.key] = e.detail.value;
                                this.#form.setAttribute('model', JSON.stringify(this.#model));
                            });

                            this.#form?.setAttribute('model', JSON.stringify(this.#model));

                            this.#createBtn?.addEventListener('click', () => this.#create());
                            this.#prevBtn?.addEventListener('click', () => {
                                if (this.#page > 1) {
                                    this.#page -= 1;
                                    this.#loadList();
                                }
                            });
                            this.#nextBtn?.addEventListener('click', () => {
                                if (this.#page < this.#totalPages()) {
                                    this.#page += 1;
                                    this.#loadList();
                                }
                            });

                            this.#table?.addEventListener('table:action', e => {
                                const { action, row } = e.detail;
                                if (action === 'copy') this.#copy(row.short_url);
                                if (action === 'delete') this.#delete(row.short_code);
                            });
                        }

                        #totalPages() {
                            return Math.max(1, Math.ceil(this.#total / this.#pageSize) || 1);
                        }

                        #updatePagination() {
                            const totalPages = this.#totalPages();
                            this.#totalEl.textContent = \`共 \${this.#total} 条\`;
                            this.#pageEl.textContent = \`第 \${this.#page}/\${totalPages} 页\`;
                            this.#prevBtn.disabled = this.#page <= 1;
                            this.#nextBtn.disabled = this.#page >= totalPages;
                        }

                        async #loadList() {
                            if (!this.#enabled) return;
                            this.#table.setAttribute('loading', '');
                            try {
                                const res = await fetch(\`/api/queryList?page=\${this.#page}&pageSize=\${this.#pageSize}\`);
                                if (!res.ok) throw new Error('加载失败');
                                const json = await res.json();
                                const data = json.data || { total: 0, items: [] };
                                this.#total = data.total || 0;
                                const totalPages = this.#totalPages();
                                if (this.#page > totalPages) {
                                    this.#page = totalPages;
                                }
                                this.#table.setAttribute('data', JSON.stringify(data.items || []));
                                this.#updatePagination();
                            } catch (error) {
                                this.#table.setAttribute('data', '[]');
                                notification.error(error.message || '加载列表失败');
                            } finally {
                                this.#table.removeAttribute('loading');
                            }
                        }

                        async #create() {
                            if (!this.#enabled) {
                                notification.error('短链服务未启用');
                                return;
                            }
                            const longUrl = (this.#model.long_url || '').trim();
                            if (!longUrl) {
                                notification.error('请输入长链地址');
                                return;
                            }

                            const serve = \`\${location.protocol}//\${location.host}\`;
                            try {
                                const res = await fetch('/api/add', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ long_url: longUrl, serve })
                                });
                                if (!res.ok) {
                                    let message = '生成短链失败';
                                    try {
                                        const err = await res.json();
                                        message = err.message || message;
                                    } catch (_) {}
                                    throw new Error(message);
                                }
                                notification.success('生成短链成功');
                                this.#model.long_url = '';
                                this.#form.setAttribute('model', JSON.stringify(this.#model));
                                this.#page = 1;
                                await this.#loadList();
                            } catch (error) {
                                notification.error(error.message || '生成短链失败');
                            }
                        }

                        async #copy(text) {
                            if (!text) {
                                notification.error('复制内容不能为空');
                                return;
                            }
                            try {
                                if (navigator.clipboard && window.isSecureContext) {
                                    await navigator.clipboard.writeText(text);
                                } else {
                                    const textArea = document.createElement('textarea');
                                    textArea.value = text;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    const ok = document.execCommand('copy');
                                    textArea.remove();
                                    if (!ok) throw new Error('复制失败');
                                }
                                notification.success('复制成功');
                            } catch (error) {
                                notification.error('复制失败: ' + (error.message || '未知错误'));
                            }
                        }

                        async #delete(code) {
                            if (!code) return;
                            if (!confirm('确认删除该短链？')) return;
                            try {
                                const res = await fetch(\`/api/delete?code=\${encodeURIComponent(code)}\`, {
                                    method: 'DELETE'
                                });
                                if (!res.ok) throw new Error('删除失败');
                                notification.success('删除成功');
                                await this.#loadList();
                            } catch (error) {
                                notification.error(error.message || '删除失败');
                            }
                        }
                    }

                    new ShortUrlManager();
                </script>
            </body>
        </html>
    `;

    return new Response(html, {
        headers: new Headers({
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        })
    });
}
```

- [ ] **Step 2: Update `page.ts` — re-export + convert-page nav**

1. Remove the stub `showShortUrlPage` function body from `src/page/page.ts` (lines ~436–457).
2. At the top of `page.ts`, add:

```typescript
export { showShortUrlPage } from './shortUrl.page';
```

3. On the convert page header, replace:

```html
<span class="header__title">订阅转换</span>

<button class="header__theme"></button>
```

with:

```html
<span class="header__title">订阅转换</span>

<div class="header__right">
    <a class="header__nav" href="/shortUrl">短链管理</a>
    <button class="header__theme" type="button"></button>
</div>
```

- [ ] **Step 3: Lint**

Run: `pnpm lint`

Expected: no errors in `shortUrl.page.ts` / `page.ts`.

- [ ] **Step 4: Manual smoke check**

Run: `pnpm dev:node` (or `pnpm start` / `wrangler dev` as you normally do locally)

Checklist:
1. Open `/` — header shows「短链管理」link; theme toggle still works
2. Open `/shortUrl` — themed page, title「短链管理」, link back to「订阅转换」
3. If short URL enabled: create a long URL → appears in table; copy works; delete with confirm works; pagination updates
4. If short URL disabled: create disabled, empty text「短链服务未启用」, no list request in network panel

- [ ] **Step 5: Commit**

```bash
git add src/page/shortUrl.page.ts src/page/page.ts
git commit -m "$(cat <<'EOF'
feat(page): add short URL management page

EOF
)"
```

---

### Task 4: Spec coverage verification

**Files:** none (verification only)

- [ ] **Step 1: Walk the design success criteria**

Confirm each item from `docs/superpowers/specs/2026-07-28-shorturl-management-design.md`:

| Criterion | How verified |
|-----------|--------------|
| `/shortUrl` themed like convert page | Visual check Task 3 Step 4 |
| Create / list / copy / delete when enabled | Manual checklist |
| Header links both ways | Manual checklist |
| `<sub-table>` reusable Web Component | `sub-table.ts` exported from `components/index.ts` |
| Disabled service empty state, no list API | Network panel when `SHORT_URL_ENABLED !== true` |

- [ ] **Step 2: No further commit unless fixes were needed**

If any checklist item fails, fix in a follow-up commit with message like `fix(page): ...` before marking the plan done.

---

## Spec Self-Review (plan author)

1. **Spec coverage:** create, list+pagination, copy, delete, nav links, `sub-table`, disabled service — all mapped to Tasks 1–3.
2. **Placeholders:** none; full component and page source included.
3. **Type consistency:** `showShortUrlPage(request, env)`, `table:action` detail `{ action, row, rowKey }`, APIs `/api/add`, `/api/queryList`, `/api/delete` match existing controller.
