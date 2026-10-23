export type Protocol = 'vless' | 'vmess' | 'trojan' | 'ss' | 'other';

export interface ParsedConfig {
  raw: string;
  protocol: Protocol;
  name: string;
  host: string;
  port: number;
  credential?: string;
  method?: string;
  network?: string;
  security?: string;
  params: Record<string, string>;
}

export interface ConfigItem extends ParsedConfig {
  id: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  lastCheckAt?: number;
  lastIp?: string;
  lastLatencyMs?: number;
}

export type Lang = 'fa' | 'en';
export type Theme = 'dark' | 'light' | 'auto';
export type ClientId = 'v2rayng' | 'hiddify' | 'streisand' | 'clash' | 'shadowrocket';

export interface Settings {
  lang: Lang;
  theme: Theme;
  defaultClient: ClientId;
}

export const PROTOCOLS: Protocol[] = ['vless', 'vmess', 'trojan', 'ss', 'other'];
