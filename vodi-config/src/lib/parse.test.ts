import { describe, expect, it } from 'vitest';
import { b64decode, clientDeepLink, parseConfig, parseMany, safeDecode } from './parse';

const toB64 = (value: string) => btoa(unescape(encodeURIComponent(value)));

const VLESS = 'vless://abc-123@de.example.com:443?type=ws&security=reality&pbk=PUB&sid=ab12&sni=www.microsoft.com#Germany';
const TROJAN = 'trojan://pa%40ss@tr.example.com:8443?security=tls&sni=tr.example.com#Trojan%20Node';
const SS = `ss://${toB64('aes-256-gcm:secret').replace(/=+$/, '')}@ss.example.com:8388#SS%20Node`;
const SS_LEGACY = `ss://${toB64('chacha20-ietf-poly1305:pw2@old.example.com:9999')}#Old`;
const VMESS = `vmess://${toB64(
  JSON.stringify({
    v: '2',
    ps: 'Tokyo Fast',
    add: 'jp1.example.com',
    port: '443',
    id: '11111111-2222-3333-4444-555555555555',
    net: 'ws',
    host: 'cdn.example.com',
    path: '/ray',
    tls: 'tls',
    sni: 'cdn.example.com',
  }),
)}`;

describe('parseConfig', () => {
  it('parses vless with reality params', () => {
    const parsed = parseConfig(VLESS);
    expect(parsed).not.toBeNull();
    expect(parsed?.protocol).toBe('vless');
    expect(parsed?.name).toBe('Germany');
    expect(parsed?.host).toBe('de.example.com');
    expect(parsed?.port).toBe(443);
    expect(parsed?.credential).toBe('abc-123');
    expect(parsed?.network).toBe('ws');
    expect(parsed?.security).toBe('reality');
    expect(parsed?.params.pbk).toBe('PUB');
  });

  it('decodes percent-encoded trojan credentials', () => {
    const parsed = parseConfig(TROJAN);
    expect(parsed?.protocol).toBe('trojan');
    expect(parsed?.credential).toBe('pa@ss');
    expect(parsed?.port).toBe(8443);
    expect(parsed?.name).toBe('Trojan Node');
  });

  it('parses SIP002 shadowsocks links', () => {
    const parsed = parseConfig(SS);
    expect(parsed?.protocol).toBe('ss');
    expect(parsed?.method).toBe('aes-256-gcm');
    expect(parsed?.credential).toBe('secret');
    expect(parsed?.host).toBe('ss.example.com');
    expect(parsed?.port).toBe(8388);
  });

  it('parses legacy base64 shadowsocks links', () => {
    const parsed = parseConfig(SS_LEGACY);
    expect(parsed?.protocol).toBe('ss');
    expect(parsed?.method).toBe('chacha20-ietf-poly1305');
    expect(parsed?.credential).toBe('pw2');
    expect(parsed?.host).toBe('old.example.com');
    expect(parsed?.port).toBe(9999);
  });

  it('parses vmess json payloads', () => {
    const parsed = parseConfig(VMESS);
    expect(parsed?.protocol).toBe('vmess');
    expect(parsed?.name).toBe('Tokyo Fast');
    expect(parsed?.host).toBe('jp1.example.com');
    expect(parsed?.network).toBe('ws');
    expect(parsed?.security).toBe('tls');
  });

  it('rejects non-config input', () => {
    expect(parseConfig('hello world')).toBeNull();
    expect(parseConfig('http://example.com')).toBeNull();
    expect(parseConfig('ftp://files.example.com')).toBeNull();
    expect(parseConfig(`vmess://${btoa('not-json')}`)).toBeNull();
  });

  it('accepts other supported protocols as generic links', () => {
    const parsed = parseConfig('hysteria2://pass@hy.example.com:443?sni=hy.example.com#HY2');
    expect(parsed?.protocol).toBe('other');
    expect(parsed?.host).toBe('hy.example.com');
    expect(parsed?.port).toBe(443);
  });
});

describe('parseMany', () => {
  it('handles multi-line pastes and deduplicates', () => {
    const result = parseMany(`${VLESS}\n${TROJAN}\n${VLESS}`);
    expect(result).toHaveLength(2);
  });

  it('expands base64 subscription bodies', () => {
    const sub = toB64(`${VLESS}\n${TROJAN}`);
    const result = parseMany(sub);
    expect(result.map((item) => item.protocol).sort()).toEqual(['trojan', 'vless']);
  });

  it('ignores empty input', () => {
    expect(parseMany('   \n\n')).toEqual([]);
  });
});

describe('helpers', () => {
  it('decodes base64url without padding', () => {
    expect(b64decode('aGVsbG8')).toBe('hello');
    expect(b64decode('aGVsbG8t')).toBe('hello-');
  });

  it('leaves invalid escapes untouched', () => {
    expect(safeDecode('100%')).toBe('100%');
  });

  it('builds client deep links', () => {
    expect(clientDeepLink('v2rayng', 'vless://x@y:1')).toBe(
      `v2rayng://install-config?url=${encodeURIComponent('vless://x@y:1')}`,
    );
    expect(clientDeepLink('streisand', 'vless://x@y:1')).toBe('streisand://import/vless://x@y:1');
    expect(clientDeepLink('clash', 'vless://x@y:1')).toContain('clash://install-config?url=');
  });
});
