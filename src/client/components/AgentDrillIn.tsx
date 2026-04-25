import { useState, useEffect } from 'preact/hooks';
import { useStore } from '../store';
import * as api from '../api';

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    zIndex: 900,
    backdropFilter: 'blur(2px)',
  },
  panel: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    width: '520px',
    maxWidth: '90vw',
    height: '100vh',
    background: 'var(--bg-elevated)',
    borderLeft: '1px solid var(--border)',
    zIndex: 901,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 200ms ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    background: 'var(--bg-hover)',
  },
  name: {
    fontSize: '16px',
    fontWeight: 600,
  },
  role: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
  },
  taskItem: {
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background var(--transition)',
    fontSize: '13px',
  },
  memoryEditor: {
    width: '100%',
    minHeight: '300px',
    padding: '12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    lineHeight: '1.5',
    resize: 'vertical' as const,
    outline: 'none',
  },
  dmBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  dmInput: {
    width: '100%',
    minHeight: '80px',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    resize: 'vertical' as const,
    outline: 'none',
  },
  filePicker: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
    marginBottom: '10px',
  },
  fileBtn: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
  },
};

type Tab = 'tasks' | 'memory' | 'dm';

export function AgentDrillIn() {
  const { state, agents, selectedAgentId, selectAgent, selectCard } = useStore();
  const [tab, setTab] = useState<Tab>('tasks');
  const [memoryContent, setMemoryContent] = useState('');
  const [memoryFile, setMemoryFile] = useState('');
  const [memoryDirty, setMemoryDirty] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [dmText, setDmText] = useState('');
  const [dmSending, setDmSending] = useState(false);

  const stateAgent = state?.agents.find(a => a.id === selectedAgentId);
  const liveAgent = agents.find(a => a.id === selectedAgentId);
  const agent = { ...stateAgent, ...liveAgent };

  const agentCards = (state?.cards ?? []).filter(c => c.agent_id === selectedAgentId);

  // Load memory file
  useEffect(() => {
    if (tab === 'memory' && agent?.path && agent?.memory_files?.length) {
      const firstFile = agent.memory_files[0];
      const path = `${agent.path.replace(/^~/, '')}/${firstFile}`;
      setMemoryFile(firstFile);
      api.readFile(`~/.openclaw/agents/${agent.id}/agent/${firstFile}`).then(res => {
        setMemoryContent(res.content || '');
      }).catch(() => setMemoryContent(''));
    }
  }, [tab, agent?.id]);

  const handleMemorySave = async () => {
    if (!agent?.id || !memoryFile) return;
    setMemorySaving(true);
    try {
      await api.writeFile(`~/.openclaw/agents/${agent.id}/agent/${memoryFile}`, memoryContent);
      setMemoryDirty(false);
    } catch { /* ignore */ }
    setMemorySaving(false);
  };

  const handleDM = async () => {
    if (!dmText.trim() || !agent?.id) return;
    setDmSending(true);
    // Use dispatch through a temp card approach or direct CLI
    // For now, we'll note this needs the dispatch system
    setTimeout(() => {
      setDmText('');
      setDmSending(false);
    }, 1000);
  };

  if (!agent?.id) return null;

  return (
    <>
      <div style={styles.overlay} onClick={() => selectAgent(null)} />
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <div style={styles.avatar}>🤖</div>
            <div>
              <div style={styles.name}>{agent.name || agent.id}</div>
              <div style={styles.role}>
                {agent.role || 'agent'}
                {agent.model && <span style={{ marginLeft: '8px', opacity: 0.6 }}>· {agent.model}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-dot ${agent.status ?? 'offline'}`} />
            <button className="btn-icon" onClick={() => selectAgent(null)} style={{ fontSize: '18px', color: 'var(--text-muted)' }}>✕</button>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            Tasks ({agentCards.length})
          </button>
          <button className={`tab ${tab === 'memory' ? 'active' : ''}`} onClick={() => setTab('memory')}>
            Memory
          </button>
          <button className={`tab ${tab === 'dm' ? 'active' : ''}`} onClick={() => setTab('dm')}>
            DM
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.tabContent}>
            {/* Tasks tab */}
            {tab === 'tasks' && (
              <>
                {agentCards.length === 0 && (
                  <div className="empty-state">
                    <span className="icon">📋</span>
                    <p>No tasks assigned to this agent</p>
                  </div>
                )}
                {agentCards.map(card => {
                  const isFailed = card.outcome?.startsWith('failed') || card.outcome?.startsWith('error');
                  return (
                    <div
                      key={card.id}
                      style={{
                        ...styles.taskItem,
                        borderLeftWidth: '3px',
                        borderLeftColor: card.status === 'running' ? 'var(--success)' : isFailed ? 'var(--error)' : 'var(--border)',
                      }}
                      onClick={() => { selectAgent(null); selectCard(card.id); }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 500 }}>{card.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {card.status} · {new Date(card.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Memory tab */}
            {tab === 'memory' && (
              <>
                <div style={styles.filePicker}>
                  {(agent.memory_files ?? ['AGENTS.md', 'MEMORY.md']).map(f => (
                    <button
                      key={f}
                      style={{
                        ...styles.fileBtn,
                        ...(f === memoryFile ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-muted)' } : {}),
                      }}
                      onClick={() => {
                        setMemoryFile(f);
                        api.readFile(`~/.openclaw/agents/${agent.id}/agent/${f}`).then(res => {
                          setMemoryContent(res.content || '');
                          setMemoryDirty(false);
                        }).catch(() => setMemoryContent(''));
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <textarea
                  style={styles.memoryEditor}
                  value={memoryContent}
                  onInput={(e) => { setMemoryContent((e.target as HTMLTextAreaElement).value); setMemoryDirty(true); }}
                  placeholder="Agent memory file contents..."
                />
                {memoryDirty && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleMemorySave} disabled={memorySaving}>
                      {memorySaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* DM tab */}
            {tab === 'dm' && (
              <div style={styles.dmBox}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Send a one-shot message to {agent.name || agent.id}
                </div>
                <textarea
                  style={styles.dmInput}
                  value={dmText}
                  onInput={(e) => setDmText((e.target as HTMLTextAreaElement).value)}
                  placeholder="Type a message..."
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleDM} disabled={dmSending || !dmText.trim()}>
                    {dmSending ? 'Sending...' : '▶ Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
