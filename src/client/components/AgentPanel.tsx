import { useStore } from '../store';

const styles = {
  panel: {
    padding: '0',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '14px 16px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  agent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'background var(--transition)',
    marginBottom: '2px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    background: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  role: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  lastActive: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textAlign: 'right' as const,
  },
  empty: {
    padding: '24px 16px',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
};

function formatAge(ts: number | null | undefined): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  businessId: string;
}

export function AgentPanel({ businessId }: Props) {
  const { agents, state, selectAgent } = useStore();

  // Get agents assigned to this business
  const stateAgents = state?.agents.filter(a => a.business_id === businessId) ?? [];
  const agentIds = new Set(stateAgents.map(a => a.id));

  // Merge with live agent data
  const liveAgents = agents.filter(a => agentIds.has(a.id));

  // Also include unassigned agents from state that are in this business
  const mergedAgents = stateAgents.map(sa => {
    const live = liveAgents.find(la => la.id === sa.id);
    return { ...sa, ...live };
  });

  // Pool agents
  const poolIds = state?.pool ?? [];
  const poolAgents = poolIds.map(id => {
    const live = agents.find(a => a.id === id);
    return live ?? { id, name: id, role: 'pool', business_id: null, path: '', model: '', memory_files: [], status: 'offline' as const, lastActivity: null };
  });

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        Agents ({mergedAgents.length})
      </div>
      <div style={styles.list}>
        {mergedAgents.map(agent => (
          <div
            key={agent.id}
            style={styles.agent}
            onClick={() => selectAgent(agent.id)}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <div style={styles.avatar}>🤖</div>
            <div style={styles.info}>
              <div style={styles.name}>
                <span className="status-dot" classList={{ [agent.status ?? 'offline']: true }} />
                {agent.name || agent.id}
              </div>
              {agent.role && <div style={styles.role}>{agent.role}</div>}
            </div>
            <div style={styles.lastActive}>{formatAge(agent.lastActivity)}</div>
          </div>
        ))}

        {mergedAgents.length === 0 && (
          <div style={styles.empty}>
            <p>No agents assigned</p>
            <p style={{ marginTop: '4px', fontSize: '11px' }}>Assign agents in settings</p>
          </div>
        )}

        {poolAgents.length > 0 && (
          <>
            <div style={{ ...styles.header, marginTop: '8px', padding: '10px 12px', borderBottom: 'none', borderTop: '1px solid var(--border)' }}>
              Pool
            </div>
            {poolAgents.map(agent => (
              <div
                key={agent.id}
                style={styles.agent}
                onClick={() => selectAgent(agent.id)}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ ...styles.avatar, opacity: 0.6 }}>🌐</div>
                <div style={styles.info}>
                  <div style={styles.name}>
                    <span className={`status-dot ${agent.status ?? 'offline'}`} />
                    {agent.name || agent.id}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
