import {
    SubButton,
    SubCheckbox,
    SubForm,
    SubFormItem,
    SubInput,
    SubMessage,
    SubModal,
    SubMultiSelect,
    SubSelect,
    SubTextarea
} from './components';
import { getAdvancedConfig, getBackendConfig, getProtocolConfig, getRemoteConfig, getShortServeConfig, getTargetConfig } from './config';
import { getDefaultBackend } from './config/backendConfig';
import { getExcludeConfig } from './config/getExcludeConfig';
import { theme } from './script/theme';
import { layout } from './style/layout';
import { style } from './style/style';

export { showShortUrlPage } from './views/shortUrl/index';

export function showPage(request: Request, env: Env): Response {
    const remoteConfig = getRemoteConfig(env);
    const backendConfig = getBackendConfig(request, env);
    const shortServeConfig = getShortServeConfig(request, env);
    const targetConfig = getTargetConfig();
    const advancedConfig = getAdvancedConfig();
    const protocolConfig = getProtocolConfig();
    const excludeConfig = getExcludeConfig();
    const defaultBackend = getDefaultBackend(request, env);

    const hasDBConfig = env.SHORT_URL_ENABLED === true;
    const hasChatConfig = Boolean(env.ORCA_ROUTER_TOKEN?.trim() && env.ORCA_ROUTER_MODEL?.trim());

    const chatButton = hasChatConfig
        ? `
                            <button class="header__chat" id="open-chat-btn" type="button" aria-label="AI 助手">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <rect x="5" y="8" width="14" height="11" rx="3"></rect>
                                    <circle cx="9.5" cy="13.5" r="1" fill="currentColor" stroke="none"></circle>
                                    <circle cx="14.5" cy="13.5" r="1" fill="currentColor" stroke="none"></circle>
                                    <path d="M12 8V4M9.5 4h5"></path>
                                    <path d="M2.5 14h2.5M19 14h2.5"></path>
                                </svg>
                            </button>`
        : '';

    const chatModal = hasChatConfig
        ? `
                <sub-modal id="chat-modal" title="AI 助手">
                    <div class="chat">
                        <div class="chat__messages" id="chat-messages">
                            <div class="chat__empty">有什么可以帮你？</div>
                        </div>
                        <div class="chat__composer">
                            <textarea
                                id="chat-input"
                                class="chat__input"
                                rows="1"
                                placeholder="输入消息，Enter 发送"
                            ></textarea>
                            <sub-button id="chat-send-btn" type="primary">发送</sub-button>
                        </div>
                    </div>
                </sub-modal>`
        : '';

    const html = `  
    <!DOCTYPE html>
        <html lang="en" theme="dark">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Sub Converter</title>

                ${style()}
                ${layout()}

                <style>
                    .input-group {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .input-group input {
                        width: 100%;
                        padding: 4px 11px;
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius);
                        transition: var(--transition);
                        min-height: 32px;
                        box-sizing: border-box;
                        flex: 1;
                        background-color: var(--background);
                        color: var(--text-disabled);
                        cursor: not-allowed;
                    }

                    .input-group input:disabled {
                        border-color: var(--border-color);
                        background-color: var(--background-disabled);
                        color: var(--text-disabled);
                        opacity: 1;
                    }

                    .sub-form-item__actions {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 20px;
                        margin-top: 24px;
                        padding-right: 100px;
                    }

                    .chat {
                        display: flex;
                        flex-direction: column;
                        height: min(52vh, 420px);
                        gap: 12px;
                    }

                    .chat__messages {
                        flex: 1;
                        min-height: 0;
                        overflow: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .chat__empty {
                        margin: auto;
                        color: var(--text-secondary);
                        font-size: 13px;
                    }

                    .chat__bubble {
                        max-width: 85%;
                        padding: 8px 12px;
                        border-radius: var(--radius);
                        font-size: 14px;
                        line-height: 1.5;
                        white-space: pre-wrap;
                        word-break: break-word;
                    }

                    .chat__bubble--user {
                        align-self: flex-end;
                        background: var(--primary-color);
                        color: #fff;
                    }

                    .chat__bubble--assistant {
                        align-self: flex-start;
                        background: var(--background-secondary);
                        color: var(--text-primary);
                    }

                    .chat__bubble--pending {
                        color: var(--text-secondary);
                    }

                    .chat__composer {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .chat__input {
                        flex: 1;
                        min-height: 32px;
                        max-height: 96px;
                        resize: none;
                        padding: 6px 11px;
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius);
                        background: var(--background);
                        color: var(--text-primary);
                        box-sizing: border-box;
                        font-size: 14px;
                        font-family: inherit;
                        line-height: 1.5;
                        outline: none;
                        transition: var(--transition);
                    }

                    .chat__input:focus {
                        border-color: var(--primary-color);
                        box-shadow: 0 0 0 2px var(--shadow);
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

                        <span class="header__title">订阅转换</span>

                        <div class="header__right">
                            <a class="header__nav" href="/shortUrl">短链管理</a>
                            <button class="header__theme" type="button"></button>
                            ${chatButton}
                        </div>
                    </header>

                    <section>
                        <sub-form id="sub-convert-form" label-width="100px">
                            <sub-form-item label="订阅链接">
                                <sub-textarea
                                    key="url"
                                    placeholder="支持yml/yaml订阅格式，base64订阅格式链接或单节点链接，多个链接每行一个或用 | 分隔"
                                    rows="4"
                                ></sub-textarea>
                            </sub-form-item>

                            <sub-form-item label="生成类型">
                                <sub-select key="target"></sub-select>
                            </sub-form-item>

                            <sub-form-item label="远程配置">
                                <sub-select key="config" filterable></sub-select>
                            </sub-form-item>

                            <sub-form-item label="后端地址">
                                <sub-select key="backend" filterable></sub-select>
                            </sub-form-item>

                            <sub-form-item label="节点协议">
                                <sub-multi-select key="protocol"></sub-multi-select>
                            </sub-form-item>

                            <sub-form-item label="排除节点">
                                <sub-multi-select key="exclude"></sub-multi-select>
                            </sub-form-item>

                            <sub-form-item label="高级选项">
                                <sub-checkbox key="advanced" span="${advancedConfig.length}"></sub-checkbox>
                            </sub-form-item>

                            <sub-form-item label="短链地址">
                                <sub-select key="shortServe" filterable placeholder="${!hasDBConfig ? '未配置数据库' : ''}"></sub-select>
                            </sub-form-item>

                            <sub-form-item label="定制订阅">
                                <div class="input-group">
                                    <input type="text" value="" disabled id="form-subscribe" />
                                    <sub-button type="default" onclick="sub.copySubUrl('form-subscribe')">
                                        <svg
                                            viewBox="64 64 896 896"
                                            focusable="false"
                                            data-icon="copy"
                                            width="1em"
                                            height="1em"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"
                                            ></path>
                                        </svg>
                                        复制
                                    </sub-button>
                                </div>
                            </sub-form-item>

                            <sub-form-item label="订阅短链">
                                <div class="input-group">
                                    <input type="text" value="" disabled id="form-short-url" />
                                    <sub-button type="default" onclick="sub.copySubUrl('form-short-url')">
                                        <svg
                                            viewBox="64 64 896 896"
                                            focusable="false"
                                            data-icon="copy"
                                            width="1em"
                                            height="1em"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"
                                            ></path>
                                        </svg>
                                        复制
                                    </sub-button>
                                </div>
                            </sub-form-item>

                            <sub-form-item>
                                <div class="sub-form-item__actions">
                                    <sub-button disabled id="generate-sub-btn" type="default">生成订阅链接</sub-button>
                                    <sub-button disabled id="generate-short-url-btn" type="default">生成短链</sub-button>
                                </div>
                            </sub-form-item>
                        </sub-form>
                    </section>
                </main>
                ${chatModal}

                ${SubInput()}
                ${SubTextarea()}
                ${SubSelect()}
                ${SubMultiSelect()}
                ${SubCheckbox()}
                ${SubFormItem()}
                ${SubForm()}
                ${SubButton()}
                ${SubMessage()}
                ${SubModal()}

                <script>
                    const formConfig = {
                        target: {
                            type: 'sub-select',
                            options: ${JSON.stringify(targetConfig)}
                        },
                        config: {
                            type: 'sub-select',
                            options: ${JSON.stringify(remoteConfig)}
                        },
                        backend: {
                            type: 'sub-select',
                            options: ${JSON.stringify(backendConfig)}
                        },
                        protocol: {
                            type: 'sub-multi-select',
                            options: ${JSON.stringify(protocolConfig)}
                        },
                        exclude: {
                            type: 'sub-multi-select',
                            options: ${JSON.stringify(excludeConfig)}
                        },
                        advanced: {
                            type: 'sub-checkbox',
                            options: ${JSON.stringify(advancedConfig)}
                        },
                        shortServe: {
                            type: 'sub-select',
                            options: ${JSON.stringify(shortServeConfig)}
                        }
                    };

                    class Sub {
                        #model = {
                            target: '${targetConfig[0].value}',
                            config: '${remoteConfig[0].value}',
                            backend: '${defaultBackend}',
                            protocol: '${JSON.stringify(protocolConfig.map(item => item.value))}',
                            exclude: '${JSON.stringify([])}',
                            advanced: ['emoji', 'new_name', 'udp'],
                            shortServe: '${shortServeConfig[0]?.value ?? ''}',

                            subUrl: '',
                            shortUrl: ''
                        };

                        #formSubscribe = this.#$('#form-subscribe');
                        #formShortUrl = this.#$('#form-short-url');

                        #generateSubBtn = this.#$('#generate-sub-btn');
                        #generateShortUrlBtn = this.#$('#generate-short-url-btn');

                        #form = this.#$('#sub-convert-form');
                        #formItems = this.#form.querySelectorAll('sub-form-item');

                        #headerIcon = this.#$('.header__icon');

                        constructor() {
                            this.#init();
                            this.#bindEvents();
                        }

                        #init() {
                            this.#formItems.forEach(item => {
                                const formItem = item.querySelector('[key]');
                                if (formItem) {
                                    const formItemKey = formItem.getAttribute('key');
                                    const type = formConfig[formItemKey]?.type;
                                    if (type && ['sub-select', 'sub-checkbox', 'sub-multi-select'].includes(type)) {
                                        formItem.setAttribute('options', JSON.stringify(formConfig[formItemKey].options));
                                    }

                                    if(formItemKey === 'shortServe' && ${!hasDBConfig}) {
                                        formItem.setAttribute('disabled', 'true');
                                    }

                                    if (formConfig[formItemKey]?.disabled) {
                                        formItem.setAttribute('disabled', '');
                                    }
                                }
                            });

                            this.#form.setAttribute('model', JSON.stringify(this.#model));
                        }

                        #bindEvents() {

                            this.#headerIcon.addEventListener('click', () => {
                                window.open('https://github.com/jwyGithub/sub-convert');
                            });


                            this.#form.addEventListener('form:change', e => {
                                this.#model[e.detail.key] = e.detail.value;
                                this.#form.setAttribute('model', JSON.stringify(this.#model));

                                if (this.#model.url) {
                                    this.#generateSubBtn.removeAttribute('disabled');
                                } else {
                                    this.#generateSubBtn.setAttribute('disabled', '');
                                }
                            });

                            this.#generateSubBtn.addEventListener('click', () => {
                                const url = new URL(this.#model.backend + '/sub');
                                url.searchParams.set('target', this.#model.target);
                                url.searchParams.set('url', this.#model.url);
                                url.searchParams.set('insert', 'true');
                                url.searchParams.set('config', this.#model.config);
                                url.searchParams.set('protocol', Array.isArray(this.#model.protocol) ? JSON.stringify(this.#model.protocol) : this.#model.protocol);
                                url.searchParams.set('exclude', Array.isArray(this.#model.exclude) ? JSON.stringify(this.#model.exclude) : this.#model.exclude);
                                
                                const advancedOptions = this.#getAdvancedOptions(this.#model);

                                advancedOptions.forEach(option => {
                                    url.searchParams.set(option.label, option.value);
                                });

                                const subUrl = url.toString();
                                this.#formSubscribe.value = subUrl;
                                this.#model.subUrl = subUrl;

                                this.#generateShortUrlBtn.removeAttribute('disabled');
                            });



                            this.#generateShortUrlBtn.addEventListener('click', async () => {
                                if (!this.#model.shortServe) {
                                    notification.error('短链服务不存在');
                                    return;
                                }

                                // 构建请求数据
                                const requestData = {
                                    serve: this.#model.shortServe,
                                    long_url: this.#model.subUrl
                                };

                                // 发送请求
                                const response = await fetch(\`\${this.#model.shortServe}/api/add\`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(requestData)
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    this.#formShortUrl.value = data.data.short_url;
                                    this.#model.shortUrl = data.data.short_url;
                                    notification.success('生成短链接成功');
                                } else {
                                    notification.error('生成短链接失败');
                                }
                            });
                        }

                        #getAdvancedOptions(model) {
                            return formConfig.advanced.options.map(option => {
                                return {
                                    label: option.value,
                                    value: model.advanced.includes(option.value)
                                };
                            });
                        }

                        /**
                         * 获取元素
                         * @param {string} selector
                         * @returns {HTMLElement}
                         */
                        #$(selector) {
                            return document.querySelector(selector);
                        }

                        async copySubUrl(dom) {
                            const text = this.#$(\`#\${dom}\`).value;
                            if (!text) {
                                notification.error('复制内容不能为空');
                                return;
                            }

                            const success = await this.copyToClipboard(text);
                            if (success) {
                                notification.success('复制成功');
                            }
                        }

                        async copyToClipboard(text) {
                            try {
                                if (navigator.clipboard && window.isSecureContext) {
                                    // 优先使用 Clipboard API
                                    await navigator.clipboard.writeText(text);
                                    return true;
                                } else {
                                    // 降级使用 document.execCommand
                                    const textArea = document.createElement('textarea');
                                    textArea.value = text;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    textArea.style.top = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();

                                    const success = document.execCommand('copy');
                                    textArea.remove();

                                    if (!success) {
                                        throw new Error('复制失败');
                                    }
                                    return true;
                                }
                            } catch (error) {
                                notification.error('复制失败: ' + (error.message || '未知错误'));
                                return false;
                            }
                        }
                    }

                    const sub = new Sub();

                    class Chat {
                        #history = [];
                        #pending = false;
                        #modal = document.querySelector('#chat-modal');
                        #openBtn = document.querySelector('#open-chat-btn');
                        #sendBtn = document.querySelector('#chat-send-btn');
                        #input = document.querySelector('#chat-input');
                        #list = document.querySelector('#chat-messages');

                        constructor() {
                            this.#openBtn.addEventListener('click', () => {
                                this.#modal.open = true;
                            });
                            this.#modal.addEventListener('modal:open', () => {
                                this.#input.focus();
                            });
                            this.#sendBtn.addEventListener('click', () => this.#send());
                            this.#input.addEventListener('keydown', e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    this.#send();
                                }
                            });
                        }

                        async #send() {
                            const text = this.#input.value.trim();
                            if (!text || this.#pending) return;

                            this.#history.push({ role: 'user', content: text });
                            this.#input.value = '';
                            this.#pending = true;
                            this.#sendBtn.setAttribute('disabled', '');
                            this.#render(true);

                            try {
                                const response = await fetch('/api/chat', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ messages: this.#history })
                                });
                                const data = await response.json().catch(() => ({}));
                                if (!response.ok) {
                                    throw new Error(data.message || '请求失败');
                                }
                                this.#history.push({ role: 'assistant', content: data.data.content });
                            } catch (error) {
                                notification.error(error.message || '发送失败');
                            } finally {
                                this.#pending = false;
                                this.#sendBtn.removeAttribute('disabled');
                                this.#render(false);
                                this.#input.focus();
                            }
                        }

                        #render(pending) {
                            this.#list.replaceChildren();
                            if (this.#history.length === 0 && !pending) {
                                const empty = document.createElement('div');
                                empty.className = 'chat__empty';
                                empty.textContent = '有什么可以帮你？';
                                this.#list.appendChild(empty);
                                return;
                            }

                            this.#history.forEach(item => {
                                this.#appendBubble(item.role === 'user' ? 'user' : 'assistant', item.content);
                            });
                            if (pending) {
                                this.#appendBubble('assistant pending', '思考中...');
                            }
                            this.#list.scrollTop = this.#list.scrollHeight;
                        }

                        #appendBubble(kind, content) {
                            const bubble = document.createElement('div');
                            const role = kind.startsWith('user') ? 'user' : 'assistant';
                            bubble.className = 'chat__bubble chat__bubble--' + role;
                            if (kind.includes('pending')) {
                                bubble.classList.add('chat__bubble--pending');
                            }
                            bubble.textContent = content;
                            this.#list.appendChild(bubble);
                        }
                    }

                    ${hasChatConfig ? 'new Chat();' : ''}

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

