import type { ConfigItem } from '../lib/types';
import { protocolLabel } from '../lib/parse';
import type { Translate } from '../i18n';
import { Icon } from './Icons';

interface Props {
  item: ConfigItem;
  onOpen: (item: ConfigItem) => void;
  onToggleStar: (item: ConfigItem) => void;
  t: Translate;
}

function badgeText(item: ConfigItem): string {
  switch (item.protocol) {
    case 'vless':
      return 'VLESS';
    case 'vmess':
      return 'VMess';
    case 'trojan':
      return 'TROJAN';
    case 'ss':
      return 'SS';
    default:
      return 'LINK';
  }
}

export function ConfigCard({ item, onOpen, onToggleStar, t }: Props) {
  return (
    <div className="card" onClick={() => onOpen(item)} role="button" tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item);
        }
      }}
    >
      <div className={`card-badge ${item.protocol}`} aria-hidden="true">
        {badgeText(item)}
      </div>

      <div className="card-body">
        <div className="card-title-row">
          <span className="card-title">{item.name || item.host}</span>
        </div>
        <div className="card-meta">
          <span>{item.host}</span>
          <span className="dot" />
          <span>{item.port}</span>
          <span className="dot" />
          <span>{protocolLabel(item.protocol)}</span>
          {typeof item.lastLatencyMs === 'number' && (
            <span className="pill">{item.lastLatencyMs} ms</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`star-btn ${item.favorite ? 'on' : ''}`}
        aria-label={t('home.favorites')}
        aria-pressed={item.favorite}
        onClick={(event) => {
          event.stopPropagation();
          onToggleStar(item);
        }}
      >
        <Icon name="star" size={19} filled={item.favorite} />
      </button>
    </div>
  );
}
