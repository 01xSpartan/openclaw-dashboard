import { useStore } from '../store';

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    flexShrink: 0,
  },
  header: {
    padding: '16px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '0 8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'background var(--transition)',
    marginBottom: '2px',
  },
  itemHover: {
    background: 'var(--bg-hover)',
  },
  itemActive: {
    background: 'var(--accent-muted)',
  },
  icon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  tagline: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  section: {
    borderTop: '1px solid var(--border)',
    marginTop: '8px',
  },
  footer: {
    padding: '12px',
    borderTop: '1px solid var(--border)',
  },
  addBtn: {
    width: '100%',
    padding: '8px',
    borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    border: '1px dashed var(--border)',
  },
  cardCount: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--bg-primary)',
    padding: '1px 6px',
    borderRadius: '8px',
    fontWeight: 500,
  },
};

interface SidebarProps {
  onNewBusiness: () => void;
}

export function Sidebar({ onNewBusiness }: SidebarProps) {
  const { state, selectedBusinessId, selectBusiness } = useStore();

  const businesses = state?.businesses ?? [];
  const pool = state?.pool ?? [];
  const cards = state?.cards ?? [];

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>Businesses</div>
      <div style={styles.list}>
        {businesses.map(biz => {
          const isActive = biz.id === selectedBusinessId;
          const bizCards = cards.filter(c => c.business_id === biz.id);
          const activeCards = bizCards.filter(c => c.status === 'running').length;

          return (
            <div
              key={biz.id}
              style={{
                ...styles.item,
                ...(isActive ? styles.itemActive : {}),
              }}
              onClick={() => selectBusiness(biz.id)}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div style={{ ...styles.icon, background: biz.color + '22', color: biz.color }}>
                {biz.icon}
              </div>
              <div style={styles.info}>
                <div style={styles.name} className="truncate">{biz.name}</div>
                {biz.tagline && <div style={styles.tagline}>{biz.tagline}</div>}
              </div>
              {activeCards > 0 && (
                <span className="chip running" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {activeCards}
                </span>
              )}
              {bizCards.length > 0 && activeCards === 0 && (
                <span style={styles.cardCount}>{bizCards.length}</span>
              )}
            </div>
          );
        })}

        {businesses.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <span className="icon">🏢</span>
            <p style={{ fontSize: '12px' }}>No businesses yet</p>
          </div>
        )}

        {pool.length > 0 && (
          <div style={styles.section}>
            <div style={{ ...styles.header, paddingTop: '12px' }}>Pool Agents</div>
            {pool.map(agentId => (
              <div key={agentId} style={styles.item}>
                <div style={{ ...styles.icon, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  🤖
                </div>
                <div style={styles.info}>
                  <div style={styles.name}>{agentId}</div>
                  <div style={styles.tagline}>pool agent</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button
          style={styles.addBtn}
          onClick={onNewBusiness}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          + New Business
        </button>
      </div>
    </div>
  );
}
