import { useMemo, useState } from 'react';
import type { ParsedConfig } from '../lib/types';
import { parseMany, protocolLabel } from '../lib/parse';
import type { Translate } from '../i18n';
import { Icon } from '../components/Icons';
import { ScannerModal } from '../components/ScannerModal';

interface Props {
  t: Translate;
  existing: Set<string>;
  onAdd: (configs: ParsedConfig[], fromScan: boolean) => void;
  onNotice: (message: string) => void;
}

export function AddPage({ t, existing, onAdd, onNotice }: Props) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedConfig[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);

  const newOnes = useMemo(() => (parsed ?? []).filter((c) => !existing.has(c.raw)), [parsed, existing]);

  const runParse = (raw?: string) => {
    const source = raw ?? text;
    const found = parseMany(source);
    setParsed(found);
    setSelected(new Set(found.map((c) => c.raw)));
    if (found.length === 0) onNotice(t('add.noValid'));
  };

  const toggle = (raw: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(raw)) next.delete(raw);
      else next.add(raw);
      return next;
    });
  };

  const pasteFromClipboard = async () => {
    try {
      const value = await navigator.clipboard.readText();
      if (!value) return;
      setText((prev) => (prev ? `${prev}\n${value}` : value));
      runParse(value);
    } catch {
      onNotice(t('add.noValidText'));
    }
  };

  const submit = () => {
    const chosen = newOnes.filter((c) => selected.has(c.raw));
    if (chosen.length === 0) return;
    onAdd(chosen, false);
    setText('');
    setParsed(null);
    setSelected(new Set());
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="brand">
            <span className="brand-dot" />
            VODI CONFIG
          </div>
          <h1 className="page-title">{t('add.title')}</h1>
          <p className="page-subtitle">{t('add.subtitle')}</p>
        </div>
        <button className="icon-btn" onClick={() => setScanning(true)} aria-label={t('add.scan')} type="button">
          <Icon name="scan" size={20} />
        </button>
      </div>

      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={pasteFromClipboard} type="button">
          <Icon name="copy" size={16} />
          {t('add.paste')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setScanning(true)} type="button">
          <Icon name="qr" size={16} />
          {t('add.scan')}
        </button>
      </div>

      <div className="textarea-wrap">
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setParsed(null);
          }}
          placeholder={t('add.placeholder')}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={t('add.placeholder')}
        />
      </div>

      {parsed && parsed.length === 0 && (
        <div className="dns-result error" style={{ marginBottom: 12 }}>
          <Icon name="alert" size={18} />
          <div>
            <strong>{t('add.noValid')}</strong>
            <div className="small">{t('add.noValidText')}</div>
          </div>
        </div>
      )}

      {parsed && parsed.length > 0 && (
        <div className="detected">
          <div className="detected-head">
            <Icon name="check" size={17} />
            {t('add.detected', { n: newOnes.length })}
          </div>
          {parsed.map((config, index) => {
            const duplicate = existing.has(config.raw);
            const isSelected = selected.has(config.raw);
            return (
              <div
                key={`${config.raw}-${index}`}
                className="detected-item"
                onClick={() => {
                  if (!duplicate) toggle(config.raw);
                }}
                role="checkbox"
                aria-checked={isSelected && !duplicate}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!duplicate) toggle(config.raw);
                  }
                }}
                style={{ opacity: duplicate ? 0.55 : 1 }}
              >
                <span className={`checkbox ${isSelected && !duplicate ? 'on' : ''}`}>
                  <Icon name="check" size={13} />
                </span>
                <span className="name">
                  {config.name}
                  <span className="host"> · {config.host}</span>
                </span>
                <span className="chip" style={{ padding: '3px 8px', fontSize: '0.62rem' }}>
                  {duplicate ? t('add.duplicate') : protocolLabel(config.protocol)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => runParse()} type="button" disabled={!text.trim()}>
          <Icon name="search" size={17} />
          {t('add.parse')}
        </button>
        <button
          className="btn btn-primary"
          onClick={submit}
          type="button"
          disabled={newOnes.filter((c) => selected.has(c.raw)).length === 0}
        >
          <Icon name="plus" size={17} />
          {t('add.submit')}
        </button>
      </div>

      <div className="tips">
        <h4>
          <Icon name="info" size={16} />
          {t('add.tipsTitle')}
        </h4>
        <ul>
          <li>{t('add.tip1')}</li>
          <li>{t('add.tip2')}</li>
          <li>{t('add.tip3')}</li>
        </ul>
      </div>

      {scanning && (
        <ScannerModal
          t={t}
          onClose={() => setScanning(false)}
          onResult={(link) => {
            setScanning(false);
            setText(link);
            onAdd(parseMany(link), true);
          }}
        />
      )}
    </div>
  );
}
