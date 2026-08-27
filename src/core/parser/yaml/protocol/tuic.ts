/**
 * 将 Clash(.meta) TUIC 配置对象转换为 TUIC 标准协议 URL
 * @param {object} config - TUIC 配置对象
 * @returns {string} TUIC 标准协议 URL (tuic://uuid:password@server:port?...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function tuicConvert(config: Record<string, any>): string {
    if (!config || !config.server || !config.port || !config.uuid) {
        throw new Error('TUIC configuration object must contain server, port, and uuid.');
    }

    const server = config.server;
    const port = config.port;
    const uuid = config.uuid;
    const password = config.password ?? '';
    const remarks = config.name || '';

    const parameters = new URLSearchParams();

    const congestion = config['congestion-controller'] || config.congestion_control;
    if (congestion) {
        parameters.append('congestion_control', congestion);
    }

    const udpRelayMode = config['udp-relay-mode'] || config.udp_relay_mode;
    if (udpRelayMode) {
        parameters.append('udp_relay_mode', udpRelayMode);
    }

    if (config.alpn && (typeof config.alpn === 'string' || Array.isArray(config.alpn))) {
        parameters.append('alpn', Array.isArray(config.alpn) ? config.alpn.join(',') : config.alpn);
    }

    const sni = config.sni || config.servername;
    if (sni) {
        parameters.append('sni', sni);
    }

    const insecure = config.insecure ?? config['skip-cert-verify'];
    if (typeof insecure === 'boolean') parameters.append('allow_insecure', insecure ? '1' : '0');

    if (config['disable-sni']) {
        parameters.append('disable_sni', '1');
    }

    const queryString = parameters.toString();

    const userInfo = `${encodeURIComponent(uuid)}:${encodeURIComponent(password)}`;
    const encodedServer = encodeURIComponent(server);
    const encodedRemarks = encodeURIComponent(remarks);

    let tuicUrl = `tuic://${userInfo}@${encodedServer}:${port}`;
    if (queryString) {
        tuicUrl += `?${queryString}`;
    }
    if (remarks) {
        tuicUrl += `#${encodedRemarks}`;
    }

    return tuicUrl;
}
