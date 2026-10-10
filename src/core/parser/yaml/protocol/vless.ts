/**
 * 将 Vless 配置对象转换为 Vless 标准协议 URL
 * @param {object} config - Vless 配置对象
 * @returns {string} Vless 标准协议 URL (vless://...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function vlessConvert(config: Record<string, any>): string {
    if (config.type !== 'vless') {
        throw new Error('Configuration type must be "vless"');
    }
    if (!config.uuid || !config.server || !config.port) {
        throw new Error('Missing required fields: uuid, server, or port');
    }

    const uuid = config.uuid;
    const server = config.server;
    const port = config.port;
    const nameFragment = `#${encodeURIComponent(config.name || 'vless-node')}`;

    // 注意：URLSearchParams 在 toString() 时会自动做一次百分号编码，
    // 因此这里所有的值都必须是原始值，绝对不要再手动 encodeURIComponent，否则会二次编码。
    const params = new URLSearchParams();
    const network = config.network || 'tcp';

    // VLESS 本身不加密，标准分享链接固定携带 encryption=none
    params.set('encryption', 'none');

    let securityLayer = 'none';

    if (config.security === 'reality' || config['reality-opts']) securityLayer = 'reality';
    else if (config.security === 'tls' || config.tls === true) {
        securityLayer = 'tls';
    }

    if (network !== 'tcp' || (network === 'tcp' && config['tcp-opts']?.header?.type && config['tcp-opts'].header.type !== 'none')) {
        params.set('type', network);
    }

    if (securityLayer === 'tls') {
        params.set('security', 'tls');
        if (config.servername) {
            params.set('sni', config.servername);
        }
        if (Array.isArray(config.alpn) && config.alpn.length > 0) {
            params.set('alpn', config.alpn.join(','));
        }
        const fingerprint = config['client-fingerprint'] || config.fingerprint;
        if (fingerprint) {
            params.set('fp', fingerprint);
        }
        if (config['skip-cert-verify'] === true) {
            params.set('allowInsecure', '1');
        }
    } else if (securityLayer === 'reality') {
        params.set('security', 'reality');
        if (config.servername) {
            params.set('sni', config.servername);
        }

        const realityOpts = config['reality-opts'] || {};
        const publicKey = realityOpts['public-key'] || realityOpts.publicKey; // Check both key styles
        const shortId = realityOpts['short-id'] || realityOpts.shortId;

        if (publicKey) {
            params.set('pbk', publicKey);
        }
        if (shortId) {
            params.set('sid', shortId);
        }

        const fingerprint = config['client-fingerprint'] || config.fingerprint;
        if (fingerprint) {
            params.set('fp', fingerprint);
        }
    }

    // flow (如 xtls-rprx-vision) 对 tls 与 reality 都适用，需统一处理
    if (config.flow && (securityLayer === 'tls' || securityLayer === 'reality')) {
        params.set('flow', config.flow);
    }

    switch (network) {
        case 'tcp':
            if (config['tcp-opts']?.header?.type && config['tcp-opts'].header.type !== 'none') {
                params.set('headerType', config['tcp-opts'].header.type);
            }
            break;
        case 'ws':
            if (config['ws-opts']) {
                if (config['ws-opts'].headers?.Host) {
                    params.set('host', config['ws-opts'].headers.Host);
                }
                if (config['ws-opts'].path) {
                    params.set('path', config['ws-opts'].path);
                }
            }
            break;
        case 'grpc':
            if (config['grpc-opts']) {
                // --- Corrected gRPC mode check ---
                const grpcMode = config['grpc-opts']['grpc-mode'] || config['grpc-opts'].mode; // Check both styles
                if (grpcMode === 'multi') {
                    params.set('mode', 'multi');
                }
                // gRPC service name
                const serviceName = config['grpc-opts']['grpc-service-name'];
                if (serviceName) {
                    params.set('serviceName', serviceName);
                }
            }
            break;
        case 'quic':
            if (securityLayer !== 'tls' && securityLayer !== 'reality') {
                if (!params.has('security')) params.set('security', 'tls'); // Default guess if missing
            }
            if (config['quic-opts']) {
                if (config['quic-opts'].security && config['quic-opts'].security !== 'none') {
                    params.set('quicSecurity', config['quic-opts'].security);
                }
                if (config['quic-opts'].key) {
                    params.set('key', config['quic-opts'].key);
                }
                if (config['quic-opts'].header?.type && config['quic-opts'].header.type !== 'none') {
                    params.set('headerType', config['quic-opts'].header.type);
                }
            }
            break;
        case 'httpupgrade':
            if (config['httpupgrade-opts']) {
                if (config['httpupgrade-opts'].host) {
                    params.set('host', config['httpupgrade-opts'].host);
                }
                if (config['httpupgrade-opts'].path) {
                    params.set('path', config['httpupgrade-opts'].path);
                }
            }
            break;
        case 'h2':
            if (securityLayer !== 'tls' && securityLayer !== 'reality') {
                if (!params.has('security')) params.set('security', 'tls'); // Default guess if missing
            }
            if (config['h2-opts']) {
                const h2Host = config['h2-opts'].host;
                if (Array.isArray(h2Host) && h2Host.length > 0) {
                    params.set('host', h2Host.join(','));
                } else if (typeof h2Host === 'string') {
                    params.set('host', h2Host);
                }
                if (config['h2-opts'].path) {
                    params.set('path', config['h2-opts'].path);
                }
            }
            break;
        default:
            console.warn(`Unsupported network type for URL generation: ${network}`);
    }

    if (config.tfo === true) {
        params.set('tfo', '1');
    }

    const paramsString = params.toString();
    const url = `vless://${uuid}@${server}:${port}${paramsString ? `?${paramsString}` : ''}${nameFragment}`;

    return url;
}
