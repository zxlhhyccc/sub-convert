import { base64Encode } from 'cloudflare-tools';

/**
 * 将 Hysteria(v1) 配置对象转换为 Hysteria 标准协议 URL
 * @param {object} config - Hysteria 配置对象
 * @returns {string} Hysteria 标准协议 URL (hysteria://...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function hysteriaConvert(config: Record<string, any>): string {
    const auth = config.password || config.auth || config.auth_str;

    if (!config || !config.server || !config.port || !auth) {
        throw new Error('Hysteria configuration object must contain server, port, and authentication (password, auth, or auth_str).');
    }

    const server = config.server;
    const port = config.port;
    const remarks = config.name || ''; // 备注/别名

    const parameters = new URLSearchParams();

    // 传输协议，Hysteria v1 默认 udp (可选 wechat-video / faketcp)
    parameters.append('protocol', config.protocol || 'udp');

    // 核心认证参数
    parameters.append('auth', auth);

    // 服务器名称校验 (Hysteria v1 使用 peer 表示 SNI)
    const peer = config.sni || config.servername;
    if (peer) {
        parameters.append('peer', peer);
    }

    if (config.peerCA) {
        parameters.append('peerCA', base64Encode(config.peerCA).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')); // peerCA 通常 Base64 编码
    }
    const insecure = config.insecure ?? config['skip-cert-verify'];
    if (typeof insecure === 'boolean') parameters.append('insecure', insecure ? '1' : '0');
    if (config.alpn && (typeof config.alpn === 'string' || Array.isArray(config.alpn))) {
        parameters.append('alpn', Array.isArray(config.alpn) ? config.alpn.join(',') : config.alpn);
    }

    // 带宽：优先 upmbps/downmbps，其次从 Clash 的 up/down (如 "100 Mbps") 解析出数值
    const parseMbps = (v: unknown): number | undefined => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = Number.parseInt(String(v), 10);
        return Number.isFinite(n) ? n : undefined;
    };
    const upmbps = config.upmbps ?? parseMbps(config.up);
    const downmbps = config.downmbps ?? parseMbps(config.down);
    if (upmbps !== undefined && upmbps !== null) {
        parameters.append('upmbps', String(upmbps));
    }
    if (downmbps !== undefined && downmbps !== null) {
        parameters.append('downmbps', String(downmbps));
    }

    // 混淆：Hysteria v1 使用 obfs + obfsParam
    if (config.obfs) {
        parameters.append('obfs', config.obfs);
    }
    const obfsParam = config['obfs-param'] ?? config.obfsParam;
    if (obfsParam) {
        parameters.append('obfsParam', obfsParam);
    }

    const queryString = parameters.toString();

    const encodedServer = encodeURIComponent(server);
    const encodedRemarks = encodeURIComponent(remarks);

    let hysteriaUrl = `hysteria://${encodedServer}:${port}`;
    if (queryString) {
        hysteriaUrl += `?${queryString}`;
    }
    if (remarks) {
        hysteriaUrl += `#${encodedRemarks}`;
    }

    return hysteriaUrl;
}
