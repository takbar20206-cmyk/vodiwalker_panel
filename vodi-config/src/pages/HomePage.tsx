import { useMemo, useState } from 'react';
import type { ConfigItem, Protocol } from '../lib/types';
import type { Translate } from '../i18n';
import { ConfigCard } from '../components/ConfigCard';
import { Icon } from '../components/Icons';

interface Props {
  items: ConfigItem[];
  t: Translate;
  onOpen: (item: ConfigItem) => void;
  onToggleStar: (item: ConfigItem) => void;
  onGoAdd: () => void;
}

type Filter = 'all' | 'fav' | Protocol;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'home.filterAll' },
  { id: 'fav', label: 'home.favorites' },
  { id: 'vless', label: 'VLESS' },
  { id: 'vmess', label: 'VMess' },
  { id: 'trojan', label: 'Trojan' },
  { id: 'ss', label: 'SS' },
];

export function HomePage({ items, t, onOpen, onToggleStar, onGoAdd }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const stats = useMemo(() => {
    const protocols = new Set(items.map((item) => item.protocol));
    return {
      total: items.length,
      protocols: protocols.size,
      starred: items.filter((item) => item.favorite).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === 'fav' && !item.favorite) return false;
      if (filter !== 'all' && filter !== 'fav' && item.protocol !== filter) return false;
      if (!q) return true;
      const haystack = `${item.name} ${item.host} ${item.protocol} ${item.network ?? ''} ${item.security ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, filter]);

  const filters = useMemo(
    () =>
      FILTERS.filter(
        (f) =>
          f.id === 'all' ||
          f.id === 'fav' ||
          items.some((item) => item.protocol === (f.id as Protocol)),
      ),
    [items],
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="brand">
            <span className="brand-dot" />
            VODI CONFIG
          </div>
          <h1 className="page-title">{t('home.title')}</h1>
          <p className="page-subtitle">{t('home.subtitle')}</p>
        </div>
        <button className="icon-btn" onClick={onGoAdd} aria-label={t('nav.add')} type="button">
          <Icon name="plus" size={20} />
        </button>
      </div>

      {items.length > 0 && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">{t('home.total')}</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.protocols}</div>
              <div className="stat-label">{t('home.protocols')}</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.starred}</div>
              <div className="stat-label">{t('home.starred')}</div>
            </div>
          </div>

          <div className="search">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('home.search')}
              type="search"
              inputMode="search"
              aria-label={t('home.search')}
            />
          </div>

          <div className="chips">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.id === 'all' || f.id === 'fav' ? t(f.label) : f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Icon name="list" size={32} />
          </div>
          <h3>{t('home.emptyTitle')}</h3>
          <p>{t('home.emptyText')}</p>
          <button className="btn btn-primary" onClick={onGoAdd} type="button" style={{ maxWidth: 260 }}>
            <Icon name="plus" size={18} />
            {t('home.emptyCta')}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty" style={{ padding: '34px 20px' }}>
          <h3>{t('home.noResults')}</h3>
          <p>{t('home.noResultsText')}</p>
        </div>
      ) : (
        <div className="list">
          {visible.map((item) => (
            <ConfigCard
              key={item.id}
              item={item}
              t={t}
              onOpen={onOpen}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
