import type { TuicConfig } from '../types';
import { Faker } from '../../../shared/faker';
import { PsUtil } from '../../../shared/ps';

export class TuicParser extends Faker {
    /** * @description 原始链接 */
    #originLink: string = '';

    /** * @description 混淆链接 */
    #confuseLink: string = '';

    /** * @description vps原始配置 */
    #originConfig: Partial<TuicConfig> = {};

    /** * @description 混淆配置 */
    #confuseConfig: Partial<TuicConfig> = {};

    /** * @description 原始备注 */
    #originPs: string = '';

    /** * @description 混淆备注 */
    #confusePs: string = '';

    #tag: string = '';

    constructor(v: string) {
        super();
        this.#confusePs = crypto.randomUUID();
        // 设置原始配置
        this.setOriginConfig(v);
        // 设置混淆配置
        this.setConfuseConfig(v);
    }

    /**
     * @description 设置原始配置
     * @param {string} v
     */
    private setOriginConfig(v: string): void {
        this.#originLink = v;
        this.#originConfig = new URL(v);
        this.#originPs = this.#originConfig.hash ?? '';
        this.#tag = this.getTag(this.#originConfig.hash) ?? '';
    }

    /**
     * @description 更新原始配置
     * @param {string} ps
     */
    public updateOriginConfig(ps: string): void {
        this.#originConfig.hash = ps;
        this.#originPs = ps;
        this.#originLink = this.#originConfig.href!;
        this.setConfuseConfig(this.#originLink);
    }

    /**
     * @description 设置混淆配置
     * @param {string} v
     */
    private setConfuseConfig(v: string): void {
        this.#confuseConfig = new URL(v);
        // TUIC 的 userinfo 为 uuid:password，两段都需混淆
        this.#confuseConfig.username = this.getUsername();
        this.#confuseConfig.password = this.getPassword();
        this.#confuseConfig.host = this.getHost();
        this.#confuseConfig.hostname = this.getHostName();
        this.#confuseConfig.port = this.getPort();
        this.#confuseConfig.hash = PsUtil.setPs(this.#originPs, this.#confusePs);
        this.#confuseLink = this.#confuseConfig.href!;
    }

    public restoreClash(proxy: Record<string, any>, ps: string): Record<string, any> {
        proxy.name = ps;
        proxy.server = this.originConfig.hostname ?? '';
        proxy.port = Number(this.originConfig.port ?? 0);
        proxy.uuid = this.originConfig.username ?? '';
        proxy.password = this.originConfig.password ?? '';
        if (this.originConfig.searchParams?.has('sni')) {
            proxy.sni = this.originConfig.searchParams?.get('sni') ?? '';
        }
        if (this.originConfig.searchParams?.has('allow_insecure')) {
            proxy['skip-cert-verify'] = this.originConfig.searchParams.get('allow_insecure') === '1';
        }
        return proxy;
    }

    public restoreSingbox(outbound: Record<string, any>, ps: string): Record<string, any> {
        outbound.tag = ps;
        outbound.server = this.originConfig.hostname ?? '';
        outbound.server_port = Number(this.originConfig.port ?? 0);
        outbound.uuid = this.originConfig.username ?? '';
        outbound.password = this.originConfig.password ?? '';
        if (outbound.tls?.server_name && this.originConfig.searchParams?.has('sni')) {
            outbound.tls.server_name = this.originConfig.searchParams?.get('sni') ?? '';
        }
        if (outbound.tls && this.originConfig.searchParams?.has('allow_insecure')) {
            outbound.tls.insecure = this.originConfig.searchParams.get('allow_insecure') === '1';
        }
        return outbound;
    }

    /**
     * @description 原始备注
     * @example '#originPs'
     */
    get originPs(): string {
        return this.#originPs;
    }

    /**
     * @description 原始链接
     * @example 'tuic://...'
     */
    get originLink(): string {
        return this.#originLink;
    }

    /**
     * @description 原始配置
     */
    get originConfig(): Partial<TuicConfig> {
        return this.#originConfig;
    }

    /**
     * @description 混淆备注
     * @example 'confusePs'
     */
    get confusePs(): string {
        return encodeURIComponent(this.#confusePs);
    }

    /**
     * @description 混淆链接
     * @example 'tuic://...'
     */
    get confuseLink(): string {
        return this.#confuseLink;
    }

    /**
     * @description 混淆配置
     */
    get confuseConfig(): Partial<TuicConfig> {
        return this.#confuseConfig;
    }

    get tag(): string | null {
        return this.#tag ?? null;
    }
}

