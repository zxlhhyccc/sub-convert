export function SubModal(): string {
    return `
    <script>
        class SubModal extends HTMLElement {
            static get observedAttributes() {
                return ['open', 'title'];
            }

            #onKeydown;

            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
                this.#onKeydown = e => {
                    if (e.key === 'Escape' && this.open) this.#close();
                };
                this.#render();
            }

            connectedCallback() {
                this.#syncOpen();
                this.#syncTitle();
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (oldValue === newValue) return;
                if (name === 'open') this.#syncOpen();
                if (name === 'title') this.#syncTitle();
            }

            get open() {
                return this.hasAttribute('open');
            }

            set open(value) {
                if (value) {
                    this.setAttribute('open', '');
                } else {
                    this.removeAttribute('open');
                }
            }

            #injectStyle() {
                const style = document.createElement('style');
                style.textContent = \`
                    :host {
                        display: none;
                    }
                    :host([open]) {
                        display: block;
                    }
                    .sub-modal__mask {
                        position: fixed;
                        inset: 0;
                        z-index: 1000;
                        background: rgba(0, 0, 0, 0.45);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 24px;
                        box-sizing: border-box;
                    }
                    .sub-modal__panel {
                        width: min(520px, 100%);
                        max-height: min(80vh, 640px);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        background: var(--background);
                        color: var(--text-primary);
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius);
                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                    }
                    .sub-modal__header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 14px 16px;
                        border-bottom: 1px solid var(--border-color);
                        flex-shrink: 0;
                    }
                    .sub-modal__title {
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--text-primary);
                    }
                    .sub-modal__close {
                        appearance: none;
                        border: none;
                        background: transparent;
                        color: var(--text-secondary, var(--text-primary));
                        cursor: pointer;
                        font-size: 18px;
                        line-height: 1;
                        padding: 4px 6px;
                        border-radius: var(--radius);
                    }
                    .sub-modal__close:hover {
                        color: var(--primary-color);
                    }
                    .sub-modal__body {
                        padding: 16px;
                        flex: 1;
                        min-height: 0;
                        overflow: auto;
                    }
                    .sub-modal__footer {
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 16px 16px;
                        flex-shrink: 0;
                    }
                    .sub-modal__footer:empty,
                    .sub-modal__footer[hidden] {
                        display: none;
                    }
                \`;
                this.shadowRoot.appendChild(style);
            }

            #injectElement() {
                const mask = document.createElement('div');
                mask.className = 'sub-modal__mask';
                mask.innerHTML = \`
                    <div class="sub-modal__panel" role="dialog" aria-modal="true">
                        <div class="sub-modal__header">
                            <div class="sub-modal__title"></div>
                            <button type="button" class="sub-modal__close" aria-label="关闭">×</button>
                        </div>
                        <div class="sub-modal__body">
                            <slot></slot>
                        </div>
                        <div class="sub-modal__footer">
                            <slot name="footer"></slot>
                        </div>
                    </div>
                \`;
                this.shadowRoot.appendChild(mask);

                mask.addEventListener('click', e => {
                    if (e.target === mask) this.#close();
                });
                mask.querySelector('.sub-modal__close').addEventListener('click', () => this.#close());
                mask.querySelector('.sub-modal__panel').addEventListener('click', e => e.stopPropagation());

                const footer = mask.querySelector('.sub-modal__footer');
                const footerSlot = footer.querySelector('slot');
                const syncFooter = () => {
                    footer.hidden = footerSlot.assignedNodes({ flatten: true }).length === 0;
                };
                footerSlot.addEventListener('slotchange', syncFooter);
                syncFooter();
            }

            #close() {
                this.open = false;
                this.dispatchEvent(
                    new CustomEvent('modal:close', {
                        bubbles: true
                    })
                );
            }

            #syncOpen() {
                const isOpen = this.hasAttribute('open');
                if (isOpen) {
                    document.addEventListener('keydown', this.#onKeydown);
                    this.dispatchEvent(
                        new CustomEvent('modal:open', {
                            bubbles: true
                        })
                    );
                } else {
                    document.removeEventListener('keydown', this.#onKeydown);
                }
            }

            #syncTitle() {
                const titleEl = this.shadowRoot.querySelector('.sub-modal__title');
                if (titleEl) {
                    titleEl.textContent = this.getAttribute('title') || '';
                }
            }

            #render() {
                this.#injectStyle();
                this.#injectElement();
            }

            disconnectedCallback() {
                document.removeEventListener('keydown', this.#onKeydown);
            }
        }
        customElements.define('sub-modal', SubModal);
    </script>
    `;
}
