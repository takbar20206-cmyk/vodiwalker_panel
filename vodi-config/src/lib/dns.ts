export interface DnsResult {
  ip: string;
  latencyMs: number;
}

/** Resolves a hostname with DNS-over-HTTPS (Cloudflare, then Google). */
export async function resolveHost(host: string): Promise<DnsResult> {
  const started = performance.now();
  const name = encodeURIComponent(host);

  const endpoints = [
    { url: `https://cloudflare-dns.com/dns-query?name=${name}&type=A`, json: true },
    { url: `https://dns.google/resolve?name=${name}&type=A`, json: true },
  ];

  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(endpoint.url, {
        headers: { accept: 'application/dns-json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        Answer?: Array<{ type: number; data: string }>;
      };
      const answer = (data.Answer ?? []).find((a) => a.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(a.data));
      if (!answer) throw new Error('no A record');
      return { ip: answer.data, latencyMs: Math.round(performance.now() - started) };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('DNS lookup failed');
}
