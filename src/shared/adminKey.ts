/** Constant-time string compare for admin key checks (Worker + Node). */
export function safeEqualString(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
}

export function getConfiguredAdminKey(env: { SHORT_URL_KEY?: string }): string | null {
    const key = env.SHORT_URL_KEY?.trim();
    return key || null;
}

