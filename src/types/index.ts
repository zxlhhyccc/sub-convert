import type { ParserType } from '../core/parser/types';

export type VpsMap = Map<string, ParserType>;
export type SubType = 'base64' | 'yaml' | 'json' | 'unknown';

export type ConvertTarget = 'clash' | 'clashr' | 'singbox' | (string & {});

export interface ShortUrl {
    id: number;
    short_code: string;
    short_url: string;
    long_url: string;
    /** ISO 时间字符串；旧数据可能为 null */
    created_at?: string | null;
}

export interface ExcludeRule {
    label: string;
    value: string;
    rules: string;
}

export * from './Clash';
export * from './Singbox';
export * from './V2Ray';
