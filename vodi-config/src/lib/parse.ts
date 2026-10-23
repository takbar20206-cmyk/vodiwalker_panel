import type { ParsedConfig, Protocol } from './types';

const KNOWN: Protocol[] = ['vless', 'vmess', 'trojan', 'ss'];

/** Schemes we accept. Anything else (http, ftp, …) is not a config link. */
const SUPPORTED_SCHEMES = new Set([
  'vless',
  'vmess',
  'trojan',
  'ss',
  'ssr',
  'hysteria',
  'hysteria2',
  'hy2',
  'tuic',
  'socks',
  'socks5',
]);

const DEFAULT_PORTS: Record<string, number> = {
  vless: 443,
  vmess: 443,
  trojan: 443,
  ss: 8388,
  hysteria2: 443,
  hy2: 443,
  tuic: 443,
  socks5: 1080,
  socks: 1080,
};

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Decodes base64 / base64url with or without padding and returns UTF-8 text. */
export function b64decode(input: string): string {
  let s = input.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  while (s.length % 4 !== 0) s += '=';
  try {
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function isKnownProtocol(p: string): p is Protocol {
  return (KNOWN as string[]).includes(p);
}

function normalizeProtocol(scheme: string): Protocol {
  const s = scheme.toLowerCase();
  if (s === 'ssr') return 'ss';
  return isKnownProtocol(s) ? s : 'other';
}

function guessName(raw: string): string {
  const m = raw.match(/#(.+)$/);
  return m ? safeDecode(m[1]).trim() : '';
}

function parseVmess(raw: string): ParsedConfig | null {
  const body = raw.slice('vmess://'.length).split('#')[0].trim();
  const json = b64decode(body);
  if (!json) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
  const str = (k: string) => {
    const v = data[k];
    return v === undefined || v === null ? '' : String(v);
  };
  const host = str('add');
  if (!host) return null;
  const params: Record<string, string> = {};
  const net = str('net');
  const tls = str('tls');
  const sni = str('sni') || str('host');
  if (net) params.net = net;
  if (tls) params.tls = tls;
  if (str('host')) params.host = str('host');
  if (str('path')) params.path = str('path');
  if (sni) params.sni = sni;
  if (str('alpn')) params.alpn = str('alpn');
  if (str('fp')) params.fp = str('fp');
  if (str('scy')) params.scy = str('scy');
  if (str('aid')) params.aid = str('aid');
  if (str('serviceName')) params.serviceName = str('serviceName');
  return {
    raw,
    protocol: 'vmess',
    name: str('ps') || guessName(raw) || host,
    host,
    port: Number(str('port')) || 443,
    credential: str('id'),
    network: net || 'tcp',
    security: tls || 'none',
    params,
  };
}

function parseShadowsocks(raw: string): ParsedConfig | null {
  let body = raw.slice('ss://'.length).trim();
  const name = guessName(body);
  body = body.split('#')[0];

  // SIP002: ss://<base64(method:password)>@host:port?plugin=...
  let method = '';
  let credential = '';
  let hostport = '';

  if (body.includes('@')) {
    const at = body.lastIndexOf('@');
    const userInfo = body.slice(0, at);
    hostport = body.slice(at + 1);
    if (userInfo.includes(':')) {
      const decoded = safeDecode(userInfo);
      const idx = decoded.indexOf(':');
      method = decoded.slice(0, idx);
      credential = decoded.slice(idx + 1);
    } else {
      const decoded = b64decode(userInfo);
      const idx = decoded.indexOf(':');
      if (idx > 0) {
        method = decoded.slice(0, idx);
        credential = decoded.slice(idx + 1);
      } else {
        credential = decoded;
      }
    }
  } else {
    // Legacy: ss://<base64(method:password@host:port)>
    const decoded = b64decode(body);
    const at = decoded.lastIndexOf('@');
    if (at < 0) return null;
    const userInfo = decoded.slice(0, at);
    hostport = decoded.slice(at + 1);
    const idx = userInfo.indexOf(':');
    method = idx >= 0 ? userInfo.slice(0, idx) : '';
    credential = idx >= 0 ? userInfo.slice(idx + 1) : userInfo;
  }

  hostport = hostport.split('/')[0].split('?')[0];
  const qIndex = hostport.indexOf('?');
  const clean = qIndex >= 0 ? hostport.slice(0, qIndex) : hostport;
  const lastColon = clean.lastIndexOf(':');
  if (lastColon < 0) return null;
  const host = clean.slice(0, lastColon).replace(/^\[|\]$/g, '');
  const port = Number(clean.slice(lastColon + 1));
  if (!host) return null;

  const pluginMatch = /[?&]plugin=([^&]+)/.exec(body);
  const params: Record<string, string> = {};
  if (pluginMatch) params.plugin = safeDecode(pluginMatch[1]);

  return {
    raw,
    protocol: 'ss',
    name: name || `${host}:${port}`,
    host,
    port: Number.isFinite(port) ? port : 8388,
    credential,
    method,
    network: 'tcp',
    security: 'none',
    params,
  };
}

function parseUrlLike(raw: string): ParsedConfig | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const scheme = url.protocol.replace(':', '').toLowerCase();
  const protocol = normalizeProtocol(scheme);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host) return null;

  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (value !== '') params[key] = value;
  });

  const port = Number(url.port) || DEFAULT_PORTS[scheme] || 443;
  const name = safeDecode(url.hash.replace(/^#/, '')).trim();
  const network = params.type || params.net || (protocol === 'other' ? scheme : 'tcp');
  const security = params.security || params.tls || (params.sni ? 'tls' : 'none');

  return {
    raw,
    protocol,
    name: name || `${protocol === 'other' ? scheme : protocol.toUpperCase()} • ${host}`,
    host,
    port,
    credential: safeDecode(url.username) || undefined,
    network,
    security,
    params,
  };
}

export function parseConfig(raw: string): ParsedConfig | null {
  const line = raw.trim();
  if (!/^[a-z0-9+.-]+:\/\//i.test(line)) return null;
  const scheme = line.slice(0, line.indexOf('://')).toLowerCase();
  if (!SUPPORTED_SCHEMES.has(scheme)) return null;

  if (scheme === 'vmess') return parseVmess(line);
  if (scheme === 'ss') return parseShadowsocks(line);
  return parseUrlLike(line);
}

/** Splits raw text (pasted list, subscription body, QR payload) into configs. */
export function parseMany(text: string): ParsedConfig[] {
  let source = text.trim();
  if (!source) return [];

  // A subscription can arrive as one base64 blob.
  if (!source.includes('://')) {
    const decoded = b64decode(source);
    if (decoded && decoded.includes('://')) source = decoded;
  }

  const chunks = source
    .split(/[\r\n,;\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const out: ParsedConfig[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const parsed = parseConfig(chunk);
    if (parsed && !seen.has(parsed.raw)) {
      seen.add(parsed.raw);
      out.push(parsed);
    }
  }
  return out;
}

export function clientDeepLink(client: string, link: string): string {
  const encoded = encodeURIComponent(link);
  switch (client) {
    case 'hiddify':
      return `hiddify://import/${link}`;
    case 'streisand':
      return `streisand://import/${link}`;
    case 'clash':
      return `clash://install-config?url=${encoded}`;
    case 'shadowrocket':
      return `shadowrocket://add/sub://${btoa(unescape(encodeURIComponent(link)))}`;
    case 'v2rayng':
    default:
      return `v2rayng://install-config?url=${encoded}`;
  }
}

export function protocolLabel(protocol: Protocol): string {
  switch (protocol) {
    case 'vless':
      return 'VLESS';
    case 'vmess':
      return 'VMess';
    case 'trojan':
      return 'Trojan';
    case 'ss':
      return 'Shadowsocks';
    default:
      return 'Other';
  }
}
