export function anytlsConvert(config: Record<string, any>): string {
    if (!config?.server || !config.port || !config.password) {
        throw new Error('AnyTLS configuration object must contain server, port, and password.');
    }

    const parameters = new URLSearchParams();
    const set = (name: string, value: unknown): void => {
        if (value !== undefined && value !== null && value !== '') parameters.set(name, String(value));
    };

    set('sni', config.sni ?? config.servername);
    set('alpn', Array.isArray(config.alpn) ? config.alpn.join(',') : config.alpn);
    set('fp', config['client-fingerprint'] ?? config.fingerprint);
    const insecure = config.insecure ?? config['skip-cert-verify'];
    if (typeof insecure === 'boolean') parameters.set('insecure', insecure ? '1' : '0');
    set('idle_session_check_interval', config['idle-session-check-interval'] ?? config.idle_session_check_interval);
    set('idle_session_timeout', config['idle-session-timeout'] ?? config.idle_session_timeout);
    set('min_idle_session', config['min-idle-session'] ?? config.min_idle_session);

    const query = parameters.toString();
    const name = config.name ? `#${encodeURIComponent(config.name)}` : '';
    return `anytls://${encodeURIComponent(config.password)}@${encodeURIComponent(config.server)}:${config.port}${query ? `?${query}` : ''}${name}`;
}
