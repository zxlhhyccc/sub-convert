import { base64Encode } from 'cloudflare-tools';

/**
 * 按 SIP002 规范构造 plugin 参数字符串（此处不做百分号编码，交由 URLSearchParams 统一处理）。
 * Clash 的 plugin / plugin-opts 会被映射为对应插件的参数格式：
 *  - obfs / simple-obfs -> obfs-local;obfs=<mode>;obfs-host=<host>
 *  - v2ray-plugin       -> v2ray-plugin;mode=<mode>;tls;host=<host>;path=<path>
 *  - 其它插件           -> <plugin>;<k=v>...（布尔 true 作为开关标志）
 * @param {object} config - Shadowsocks 配置对象
 * @returns {string} SIP002 plugin 字符串，未配置插件时返回空串
 */
function buildPluginString(config: Record<string, any>): string {
    const pluginName: string = config.plugin;
    if (!pluginName) return '';

    const opts = config['plugin-opts'] || {};

    // SIP002 要求插件参数值中的 \ ; = 需使用反斜杠转义
    const escape = (v: unknown): string => String(v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/=/g, '\\=');

    const parts: string[] = [];

    if (pluginName === 'obfs' || pluginName === 'simple-obfs' || pluginName === 'obfs-local') {
        parts.push('obfs-local');
        if (opts.mode) parts.push(`obfs=${escape(opts.mode)}`);
        if (opts.host) parts.push(`obfs-host=${escape(opts.host)}`);
    } else if (pluginName === 'v2ray-plugin') {
        parts.push('v2ray-plugin');
        parts.push(`mode=${escape(opts.mode || 'websocket')}`);
        if (opts.tls === true) parts.push('tls');
        if (opts.host) parts.push(`host=${escape(opts.host)}`);
        if (opts.path) parts.push(`path=${escape(opts.path)}`);
        if (opts.mux === true) parts.push('mux=1');
    } else {
        // 其它插件：通用透传
        parts.push(pluginName);
        for (const [key, value] of Object.entries(opts)) {
            if (value === true) parts.push(escape(key));
            else if (value !== false && value !== undefined && value !== null) parts.push(`${escape(key)}=${escape(value)}`);
        }
    }

    return parts.join(';');
}

/**
 * 将 Shadowsocks (SS) 配置对象转换为 SS 标准协议 URL
 * @param {object} config - Shadowsocks 配置对象
 * @returns {string} SS 标准协议 URL (ss://...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function shadowsocksConvert(config: Record<string, any>): string {
    if (!config || !config.server || !config.port || !config.cipher || !config.password) {
        throw new Error('Shadowsocks configuration object must contain server, port, cipher, and password.');
    }

    const method = config.cipher;
    const password = config.password;
    const server = config.server;
    const port = config.port;
    const remarks = config.name || ''; // 别名/备注

    // SIP002: userinfo 为 base64(method:password)
    const userInfoString = `${method}:${password}`;
    const base64UserInfo = base64Encode(userInfoString);

    const parameters = new URLSearchParams();

    // SIP002: 传输层/混淆统一通过 plugin 参数描述（而非 type/host/path 等非标准顶级参数）
    const pluginString = buildPluginString(config);
    if (pluginString) {
        parameters.append('plugin', pluginString);
    }

    const encodedServer = encodeURIComponent(server);

    let ssUrl = `ss://${base64UserInfo}@${encodedServer}:${port}`;

    const queryString = parameters.toString();
    if (queryString) {
        ssUrl += `?${queryString}`;
    }

    if (remarks) {
        ssUrl += `#${encodeURIComponent(remarks)}`;
    }

    return ssUrl;
}
