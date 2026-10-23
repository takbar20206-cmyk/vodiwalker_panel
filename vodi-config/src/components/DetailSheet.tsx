import { useEffect, useState } from 'react';
import type { ClientId, ConfigItem, Lang } from '../lib/types';
import { clientDeepLink, protocolLabel } from '../lib/parse';
import { resolveHost } from '../lib/dns';
import { openExternal } from '../lib/native';
import { paramLabel, type Translate } from '../i18n';
import { Sheet, ConfirmDialog } from './Overlay';
import { Icon } from './Icons';

const CLIENTS: ClientId[] = ['v2rayng', 'hiddify', 'streisand', 'clash', 'shadowrocket'];

interface Props {
  item: ConfigItem;
  lang: Lang;
  t: Translate;
  defaultClient: ClientId;
  onClose: () => void;
  onUpdate: (item: ConfigItem) => void;
  onDelete: (id: string) => void;
  onQr: () => void;
  onCopy: () => void;
  onShare: () => void;
}

interface DnsState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  ip?: string;
  latencyMs?: number;
}

export function DetailSheet({
  item,
  lang,
  t,
  defaultClient,
  onClose,
  onUpdate,
  onDelete,
  onQr,
  onCopy,
  onShare,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [client, setClient] = useState<ClientId>(defaultClient);
  const [dns, setDns] = useState<DnsState>({ status: 'idle' });
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    setEditing(false);
    setNameDraft(item.name);
    setDns({ status: 'idle' });
    setReveal(false);
  }, [item.id, item.name]);

  const saveName = () => {
    const next = nameDraft.trim();
    if (next && next !== item.name) onUpdate({ ...item, name: next });
    setEditing(false);
  };

  const runDns = async () => {
    setDns({ status: 'loading' });
    try {
      const result = await resolveHost(item.host);
      setDns({ status: 'ok', ip: result.ip, latencyMs: result.latencyMs });
      onUpdate({ ...item, lastCheckAt: Date.now(), lastIp: result.ip });
    } catch {
      setDns({ status: 'error' });
    }
  };

  const openInClient = () => {
    openExternal(clientDeepLink(client, item.raw));
  };

  // These keys are already shown in their own rows above.
  const shownKeys = new Set(['type', 'net', 'security', 'tls']);
  const params = Object.entries(item.params).filter(([key]) => !shownKeys.has(key));

  return (
    <Sheet title={t('detail.details')} onClose={onClose} closeLabel={t('action.close')}>
      <div className="detail-hero">
        <div className={`card-badge ${item.protocol}`}>{protocolLabel(item.protocol).slice(0, 6)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveName();
                if (event.key === 'Escape') setEditing(false);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                outline: 'none',
              }}
              aria-label={t('action.rename')}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </strong>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 28, height: 28, borderRadius: 9 }}
                onClick={() => {
                  setNameDraft(item.name);
                  setEditing(true);
                }}
                aria-label={t('action.rename')}
              >
                <Icon name="edit" size={14} />
              </button>
            </div>
          )}
          <div className="card-meta">
            <span>{item.host}</span>
            <span className="dot" />
            <span>{item.port}</span>
          </div>
        </div>
      </div>

      <div className="detail-actions">
        <button className="action-tile" type="button" onClick={onCopy}>
          <span className="tile-icon">
            <Icon name="copy" size={20} />
          </span>
          {t('action.copy')}
        </button>
        <button className="action-tile" type="button" onClick={onQr}>
          <span className="tile-icon">
            <Icon name="qr" size={20} />
          </span>
          {t('action.qr')}
        </button>
        <button className="action-tile" type="button" onClick={onShare}>
          <span className="tile-icon">
            <Icon name="share" size={20} />
          </span>
          {t('action.share')}
        </button>
        <button className="action-tile" type="button" onClick={() => setConfirmDelete(true)}>
          <span className="tile-icon" style={{ color: 'var(--danger)' }}>
            <Icon name="trash" size={20} />
          </span>
          {t('action.delete')}
        </button>
      </div>

      <button
        className="btn btn-ghost btn-block"
        type="button"
        onClick={runDns}
        disabled={dns.status === 'loading'}
        style={{ marginBottom: 14 }}
      >
        <Icon
          name={dns.status === 'loading' ? 'wifi' : 'zap'}
          size={17}
          className={dns.status === 'loading' ? 'spin' : undefined}
        />
        {dns.status === 'loading' ? t('action.dns') + '…' : t('action.dns')}
      </button>

      {dns.status === 'ok' && (
        <div className="dns-result">
          <Icon name="check" size={17} />
          <span>
            {t('detail.resolvedIp')}: {dns.ip} · {t('detail.latency')}: {dns.latencyMs} ms
          </span>
        </div>
      )}
      {dns.status === 'error' && (
        <div className="dns-result error">
          <Icon name="alert" size={17} />
          <span>{t('detail.dnsError')}</span>
        </div>
      )}

      <div className="rows">
        <div className="row">
          <span className="row-key">{t('detail.protocol')}</span>
          <span className="row-val">{protocolLabel(item.protocol)}</span>
        </div>
        <div className="row">
          <span className="row-key">{t('detail.host')}</span>
          <span className="row-val">{item.host}</span>
        </div>
        <div className="row">
          <span className="row-key">{t('detail.port')}</span>
          <span className="row-val">{item.port}</span>
        </div>
        {item.network && (
          <div className="row">
            <span className="row-key">{t('detail.network')}</span>
            <span className="row-val">{item.network}</span>
          </div>
        )}
        {item.security && (
          <div className="row">
            <span className="row-key">{t('detail.security')}</span>
            <span className="row-val">{item.security}</span>
          </div>
        )}
        {item.method && (
          <div className="row">
            <span className="row-key">{t('detail.method')}</span>
            <span className="row-val">{item.method}</span>
          </div>
        )}
        {item.credential && (
          <div className="row">
            <span className="row-key">{t('detail.credential')}</span>
            <button
              type="button"
              className="row-val"
              style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '65%', background: 'none' }}
              onClick={() => setReveal((v) => !v)}
              title={t('detail.hidden')}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {reveal ? item.credential : '•'.repeat(Math.min(14, Math.max(6, item.credential.length)))}
              </span>
              <Icon name={reveal ? 'eyeOff' : 'eye'} size={15} />
            </button>
          </div>
        )}
        {params.map(([key, value]) => (
          <div className="row" key={key}>
            <span className="row-key">{paramLabel(lang, key)}</span>
            <span className="row-val" style={{ maxWidth: '62%' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <p className="section-label">{t('action.raw')}</p>
      <div className="code-box">{item.raw}</div>

      <p className="section-label" style={{ marginTop: 18 }}>
        {t('detail.openInTitle')}
      </p>
      <div className="select-wrap" style={{ marginBottom: 10 }}>
        <select
          value={client}
          onChange={(event) => setClient(event.target.value as ClientId)}
          aria-label={t('settings.defaultClient')}
        >
          {CLIENTS.map((id) => (
            <option key={id} value={id}>
              {t(`client.${id}`)}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary btn-block" type="button" onClick={openInClient}>
        <Icon name="external" size={17} />
        {t('action.openIn')}
      </button>

      {confirmDelete && (
        <ConfirmDialog
          title={t('detail.deleteTitle')}
          text={t('detail.deleteText')}
          confirmLabel={t('action.delete')}
          cancelLabel={t('action.cancel')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete(item.id);
          }}
        />
      )}
    </Sheet>
  );
}
