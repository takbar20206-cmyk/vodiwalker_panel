import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Translate } from '../i18n';
import { Sheet } from './Overlay';
import { Icon } from './Icons';

interface Props {
  title: string;
  link: string;
  t: Translate;
  onClose: () => void;
  onCopy: () => void;
}

const safeName = (value: string) =>
  value.replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 40) || 'vodi-config';

export function QrModal({ title, link, t, onClose, onCopy }: Props) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(link, {
      margin: 1,
      width: 720,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b1020', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(async () => {
        // canvas can be unavailable in some WebViews — fall back to an SVG data URL
        try {
          const svg = await QRCode.toString(link, {
            type: 'svg',
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#0b1020', light: '#ffffff' },
          });
          if (active) setDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
        } catch {
          if (active) setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [link]);

  return (
    <Sheet title={t('action.qr')} onClose={onClose} closeLabel={t('action.close')}>
      {failed ? (
        <div className="dns-result error">{t('add.noValid')}</div>
      ) : (
        <div className="qr-card">{dataUrl ? <img src={dataUrl} alt={title} /> : null}</div>
      )}
      <p className="center small muted" style={{ marginTop: 0, marginBottom: 14 }}>
        {title}
      </p>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onCopy} type="button">
          <Icon name="copy" size={17} />
          {t('action.copy')}
        </button>
        <a
          className="btn btn-primary"
          href={dataUrl || '#'}
          download={`${safeName(title)}.png`}
          aria-disabled={!dataUrl}
        >
          <Icon name="download" size={17} />
          {t('action.download')}
        </a>
      </div>
    </Sheet>
  );
}
