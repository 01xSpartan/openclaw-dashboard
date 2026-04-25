import { useState } from 'preact/hooks';
import { useStore } from '../store';
import type { Business } from '../types';

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  icon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  name: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  url: {
    color: 'var(--accent)',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
};

interface Props {
  business: Business;
}

export function BusinessHeader({ business }: Props) {
  const { createCard } = useStore();
  const [quickAdd, setQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) return;
    await createCard({
      business_id: business.id,
      title: quickTitle.trim(),
      status: 'backlog',
    });
    setQuickTitle('');
    setQuickAdd(false);
  };

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <div style={{ ...styles.icon, background: business.color + '22', color: business.color }}>
          {business.icon}
        </div>
        <div style={styles.info}>
          <div style={styles.name}>{business.name}</div>
          <div style={styles.meta}>
            {business.url && <a href={`https://${business.url}`} target="_blank" rel="noopener" style={styles.url}>{business.url}</a>}
            {business.tagline && (
              <>
                {business.url && <span>·</span>}
                <span>{business.tagline}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        {quickAdd ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              value={quickTitle}
              onInput={(e) => setQuickTitle((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') setQuickAdd(false); }}
              placeholder="Task title..."
              autoFocus
              style={{
                padding: '6px 12px',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '200px',
                outline: 'none',
              }}
            />
            <button className="btn btn-sm btn-primary" onClick={handleQuickAdd}>Add</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setQuickAdd(false)}>✕</button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setQuickAdd(true)}>
            + New Task
          </button>
        )}
      </div>
    </div>
  );
}
