import { base64Encode } from 'cloudflare-tools';

/**
 * 将 Vmess 配置对象转换为 Vmess 标准协议 URL
 * @param {object} config - Vmess 配置对象
 * @returns {string} Vmess 标准协议 URL (vmess://...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function vmessConvert(config: Record<string, any>): string {
    if (!config || !config.server || !config.port || !config.uuid) {
        throw new Error('Vmess configuration object must contain server, port, and uuid.');
    }

    const network = config.network || 'tcp';

    const uriJson: Record<string, any> = {
        v: '2', // Vmess 协议版本，通常是 2
        ps: config.name || '',
        add: config.server,
        port: config.port,
        id: config.uuid,
        aid: config.alterId || 0,
        scy: config.cipher || 'auto',
        net: network,
        type: 'none' // header 伪装类型，默认 none
    };

    // 处理 TLS 相关配置
    if (config.tls) {
        uriJson.tls = 'tls';
        uriJson.sni = config.servername || config.server;
        if (config['client-fingerprint']) {
            uriJson.fp = config['client-fingerprint'];
        }
        if (config.alpn && (typeof config.alpn === 'string' || Array.isArray(config.alpn))) {
            uriJson.alpn = Array.isArray(config.alpn) ? config.alpn.join(',') : config.alpn;
        }
        // skip-cert-verify 通常是客户端选项，不包含在标准 URI 中
    } else {
        uriJson.tls = ''; // 关闭 TLS
    }

    // 处理不同的网络类型配置 (network)
    switch (network) {
        case 'ws': {
            const opts = config['ws-opts'] || {};
            if (opts.headers && opts.headers.Host) {
                uriJson.host = opts.headers.Host;
            } else if (uriJson.sni) {
                uriJson.host = uriJson.sni;
            } else {
                uriJson.host = uriJson.add;
            }
            uriJson.path = opts.path || '/';
            break;
        }
        case 'http': {
            // HTTP 伪装：在 vmess 分享格式中表示为 net=tcp + type=http (header 伪装类型)
            const opts = config['http-opts'] || {};
            uriJson.net = 'tcp';
            uriJson.type = 'http';
            const hosts = opts.headers?.Host;
            if (Array.isArray(hosts) && hosts.length > 0) {
                uriJson.host = hosts.join(',');
            } else if (typeof hosts === 'string') {
                uriJson.host = hosts;
            } else {
                uriJson.host = uriJson.sni || uriJson.add;
            }
            uriJson.path = Array.isArray(opts.path) ? opts.path[0] || '/' : opts.path || '/';
            break;
        }
        case 'h2': {
            const opts = config['h2-opts'] || {};
            const hosts = opts.host;
            if (Array.isArray(hosts) && hosts.length > 0) {
                uriJson.host = hosts.join(',');
            } else if (typeof hosts === 'string') {
                uriJson.host = hosts;
            }
            uriJson.path = opts.path || '/';
            break;
        }
        case 'grpc': {
            // gRPC 需要 serviceName
            const grpcOpts = config['grpc-opts'] || {};
            const serviceName = grpcOpts['grpc-service-name'] || grpcOpts.serviceName;
            if (serviceName) {
                uriJson.serviceName = serviceName;
            }
            break;
        }
        case 'tcp':
        default: {
            // tcp 下的 http 伪装 (tcp-opts.header.type === 'http')
            if (config['tcp-opts']?.header?.type === 'http') {
                uriJson.type = 'http';
                const hosts = config['tcp-opts']?.header?.request?.headers?.Host;
                if (Array.isArray(hosts) && hosts.length > 0) {
                    uriJson.host = hosts.join(',');
                } else if (typeof hosts === 'string') {
                    uriJson.host = hosts;
                }
                const path = config['tcp-opts']?.header?.request?.path;
                uriJson.path = Array.isArray(path) ? path[0] || '/' : path || '/';
            }
            break;
        }
    }

    // header 伪装为 none 时无需携带 type 字段
    if (uriJson.type === 'none') {
        delete uriJson.type;
    }

    uriJson.tfo = config.tfo ? '1' : '0';
    uriJson.udp = config.udp ? '1' : '0';

    const jsonString = JSON.stringify(uriJson);

    const base64String = base64Encode(jsonString);

    return `vmess://${base64String}`;
}
