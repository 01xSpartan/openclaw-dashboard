import { useState } from 'preact/hooks';
import { useStore } from '../store';
import { getTheme, setTheme, type Theme } from '../theme';

const styles = {
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '10px',
    color: 'var(--text-primary)',
  },
  themeGroup: {
    display: 'flex',
    gap: '8px',
  },
  themeBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    flex: 1,
    textAlign: 'center' as const,
  },
  bizList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  bizItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    fontSize: '13px',
  },
};

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { state, deleteBusiness } = useStore();
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme);
    setCurrentTheme(theme);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <h2>Settings</h2>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Theme</div>
          <div style={styles.themeGroup}>
            {(['dark', 'light', 'system'] as Theme[]).map(t => (
              <button
                key={t}
                style={{
                  ...styles.themeBtn,
                  ...(t === currentTheme ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-muted)' } : {}),
                }}
                onClick={() => handleThemeChange(t)}
              >
                {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '🖥️'} {t}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Businesses</div>
          <div style={styles.bizList}>
            {(state?.businesses ?? []).map(biz => (
              <div key={biz.id} style={styles.bizItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: biz.color }}>{biz.icon}</span>
                  <span>{biz.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{biz.id}</span>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    if (confirm(`Delete "${biz.name}"? This will remove all associated cards.`)) {
                      deleteBusiness(biz.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            {(state?.businesses ?? []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                No businesses created yet
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
