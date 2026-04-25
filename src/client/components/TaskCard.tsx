import { useStore } from '../store';
import type { Card } from '../types';

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    marginBottom: '6px',
  },
  cardHover: {
    borderColor: 'var(--accent)',
    boxShadow: 'var(--shadow-sm)',
    transform: 'translateY(-1px)',
  },
  title: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: '6px',
    lineHeight: '1.3',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  agentChip: {
    fontSize: '11px',
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  age: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap' as const,
  },
  blocked: {
    fontSize: '10px',
    padding: '1px 5px',
    borderRadius: '3px',
    background: 'var(--warning-muted)',
    color: 'var(--warning)',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
};

function formatAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface Props {
  card: Card;
}

export function TaskCard({ card }: Props) {
  const { selectCard, dispatchCard, retryCard } = useStore();

  const isFailed = card.status === 'done' && card.outcome?.startsWith('failed');
  const isError = card.status === 'done' && card.outcome?.startsWith('error');

  return (
    <div
      style={{
        ...styles.card,
        ...(card.status === 'running' ? { borderLeftColor: 'var(--success)', borderLeftWidth: '3px' } : {}),
        ...(isFailed || isError ? { borderLeftColor: 'var(--error)', borderLeftWidth: '3px' } : {}),
      }}
      onClick={() => selectCard(card.id)}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--accent)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border)';
        el.style.transform = 'none';
        if (card.status === 'running') el.style.borderLeftColor = 'var(--success)';
        if (isFailed || isError) el.style.borderLeftColor = 'var(--error)';
      }}
    >
      <div style={styles.title} className="truncate">{card.title}</div>
      <div style={styles.meta}>
        <div style={styles.left}>
          {card.agent_id && <span style={styles.agentChip}>🤖 {card.agent_id}</span>}
          {card.blocked && <span style={styles.blocked}>BLOCKED</span>}
          {card.status === 'running' && (
            <span className="chip running" style={{ fontSize: '10px', padding: '0 5px' }}>
              <span className="status-dot running" style={{ width: '6px', height: '6px' }} /> running
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(isFailed || isError) && (
            <button
              className="btn btn-sm btn-danger"
              style={{ padding: '2px 6px', fontSize: '10px' }}
              onClick={(e) => { e.stopPropagation(); retryCard(card.id); }}
            >
              Retry
            </button>
          )}
          {card.status === 'todo' && card.agent_id && (
            <button
              className="btn btn-sm btn-primary"
              style={{ padding: '2px 6px', fontSize: '10px' }}
              onClick={(e) => { e.stopPropagation(); dispatchCard(card.id); }}
            >
              Dispatch
            </button>
          )}
          <span style={styles.age}>{formatAge(card.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
