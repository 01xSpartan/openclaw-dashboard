import { useState, useEffect } from 'preact/hooks';
import { useStore } from '../store';

const styles = {
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
    display: 'inline-block',
    width: 'fit-content',
  },
  section: {
    marginBottom: '20px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  promptEditor: {
    width: '100%',
    minHeight: '120px',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    lineHeight: '1.5',
    resize: 'vertical' as const,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  outcome: {
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '200px',
    overflow: 'auto',
    lineHeight: '1.4',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
};

function formatTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export function TaskDrawer() {
  const { state, selectedCardId, selectCard, updateCard, deleteCard, dispatchCard, retryCard, killCard, agents } = useStore();
  const card = state?.cards.find(c => c.id === selectedCardId);

  const [editPrompt, setEditPrompt] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAgent, setEditAgent] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (card) {
      setEditPrompt(card.prompt || '');
      setEditTitle(card.title || '');
      setEditAgent(card.agent_id || '');
      setDirty(false);
    }
  }, [card?.id]);

  if (!card) return null;

  const isFailed = card.status === 'done' && (card.outcome?.startsWith('failed') || card.outcome?.startsWith('error'));
  const isCompleted = card.status === 'done' && card.outcome === 'completed';
  const isRunning = card.status === 'running';

  // Get available agents
  const bizAgents = state?.agents.filter(a => a.business_id === card.business_id) ?? [];
  const poolAgents = (state?.pool ?? []).map(id => ({ id, name: id }));
  const allAgents = [...bizAgents, ...poolAgents];

  const statusColor = isRunning ? 'var(--success)' : isFailed ? 'var(--error)' : isCompleted ? 'var(--accent)' : 'var(--text-muted)';
  const statusBg = isRunning ? 'var(--success-muted)' : isFailed ? 'var(--error-muted)' : isCompleted ? 'var(--accent-muted)' : 'var(--bg-hover)';

  const handleSave = async () => {
    const patch: Record<string, unknown> = {};
    if (editTitle !== card.title) patch.title = editTitle;
    if (editPrompt !== card.prompt) patch.prompt = editPrompt;
    if (editAgent !== (card.agent_id || '')) patch.agent_id = editAgent || null;
    if (Object.keys(patch).length > 0) {
      await updateCard(card.id, patch);
      setDirty(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={() => selectCard(null)} />
      <div className="drawer">
        <div className="drawer-header">
          <div style={styles.header}>
            <input
              type="text"
              value={editTitle}
              onInput={(e) => { setEditTitle((e.target as HTMLInputElement).value); setDirty(true); }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                padding: 0,
                outline: 'none',
                width: '100%',
              }}
            />
            <span style={{ ...styles.statusBadge, background: statusBg, color: statusColor }}>
              {isRunning && '● '}{card.status}{isFailed ? ' (failed)' : ''}
            </span>
          </div>
          <button className="btn-icon" onClick={() => selectCard(null)} style={{ fontSize: '18px', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="drawer-body">
          {/* Agent assignment */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Assigned Agent</div>
            <select
              value={editAgent}
              onChange={(e) => { setEditAgent((e.target as HTMLSelectElement).value); setDirty(true); }}
              style={styles.select}
              disabled={isRunning}
            >
              <option value="">— Unassigned —</option>
              {allAgents.map(a => (
                <option key={a.id} value={a.id}>{a.name || a.id}</option>
              ))}
              {/* Also show live agents not in state */}
              {agents.filter(a => !allAgents.some(sa => sa.id === a.id)).map(a => (
                <option key={a.id} value={a.id}>{a.name || a.id} (discovered)</option>
              ))}
            </select>
          </div>

          {/* Prompt editor */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Prompt</div>
            <textarea
              value={editPrompt}
              onInput={(e) => { setEditPrompt((e.target as HTMLTextAreaElement).value); setDirty(true); }}
              style={styles.promptEditor}
              disabled={isRunning}
              placeholder="Describe the task for the agent..."
            />
          </div>

          {/* Outcome */}
          {card.outcome && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Outcome</div>
              <div style={{
                ...styles.outcome,
                background: isFailed ? 'var(--error-muted)' : 'var(--success-muted)',
                color: isFailed ? 'var(--error)' : 'var(--success)',
              }}>
                {card.outcome}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Details</div>
            <div style={styles.meta}>
              <div style={styles.metaRow}><span>Created</span><span>{formatTime(card.created_at)}</span></div>
              {card.dispatched_at && <div style={styles.metaRow}><span>Dispatched</span><span>{formatTime(card.dispatched_at)}</span></div>}
              {card.ended_at && <div style={styles.metaRow}><span>Ended</span><span>{formatTime(card.ended_at)}</span></div>}
              {card.task_run_id && <div style={styles.metaRow}><span>Run ID</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{card.task_run_id}</span></div>}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          {isFailed && (
            <button className="btn btn-danger btn-sm" onClick={() => retryCard(card.id)}>↻ Retry</button>
          )}
          {isRunning && (
            <button className="btn btn-danger btn-sm" onClick={() => killCard(card.id)}>⬛ Kill</button>
          )}
          {!isRunning && card.status === 'todo' && card.agent_id && (
            <button className="btn btn-primary btn-sm" onClick={() => dispatchCard(card.id)}>▶ Dispatch</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => { deleteCard(card.id); selectCard(null); }}>🗑 Delete</button>
          <div style={{ flex: 1 }} />
          {dirty && (
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save Changes</button>
          )}
        </div>
      </div>
    </>
  );
}
