import { useStore } from '../store';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BusinessHeader } from './BusinessHeader';
import { AgentPanel } from './AgentPanel';
import { TaskBoard } from './TaskBoard';
import { TaskDrawer } from './TaskDrawer';
import { AgentDrillIn } from './AgentDrillIn';
import { NewBusinessModal } from './NewBusinessModal';
import { useState } from 'preact/hooks';

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  workspace: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  },
  agentSidebar: {
    width: '280px',
    borderLeft: '1px solid var(--border)',
    overflow: 'auto',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    gap: '12px',
  },
  errorBanner: {
    padding: '12px 20px',
    background: 'var(--error-muted)',
    color: 'var(--error)',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  noSelection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    flexDirection: 'column' as const,
    gap: '12px',
  },
};

export function AppShell() {
  const { loading, error, selectedBusinessId, selectedCardId, selectedAgentId, setError, state } = useStore();
  const [showNewBusiness, setShowNewBusiness] = useState(false);

  if (loading && !state) {
    return (
      <div style={styles.loading}>
        <span style={{ animation: 'pulse 2s ease-in-out infinite' }}>⚡</span>
        Loading dashboard...
      </div>
    );
  }

  const selectedBusiness = state?.businesses.find(b => b.id === selectedBusinessId);

  return (
    <div style={styles.shell}>
      <TopBar />

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div style={styles.body}>
        <Sidebar onNewBusiness={() => setShowNewBusiness(true)} />

        <div style={styles.main}>
          {selectedBusiness ? (
            <>
              <BusinessHeader business={selectedBusiness} />
              <div style={styles.workspace}>
                <div style={styles.content}>
                  <TaskBoard businessId={selectedBusiness.id} />
                </div>
                <div style={styles.agentSidebar}>
                  <AgentPanel businessId={selectedBusiness.id} />
                </div>
              </div>
            </>
          ) : (
            <div style={styles.noSelection}>
              <span style={{ fontSize: '48px', opacity: 0.3 }}>⚡</span>
              <span style={{ fontSize: '16px' }}>Select a business or create one to get started</span>
              <button className="btn btn-primary" onClick={() => setShowNewBusiness(true)}>
                + New Business
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawers */}
      {selectedCardId && <TaskDrawer />}
      {selectedAgentId && !selectedCardId && <AgentDrillIn />}

      {/* Modals */}
      {showNewBusiness && <NewBusinessModal onClose={() => setShowNewBusiness(false)} />}
    </div>
  );
}
