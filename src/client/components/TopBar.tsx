import { useStore } from '../store';
import { useState } from 'preact/hooks';
import { getTheme, setTheme, type Theme } from '../theme';

const styles = {
  bar: {
    height: 'var(--topbar-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
    gap: '16px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  logoIcon: {
    fontSize: '18px',
  },
  search: {
    padding: '6px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    width: '240px',
    outline: 'none',
    transition: 'border-color var(--transition)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  chips: {
    display: 'flex',
    gap: '8px',
  },
  themeBtn: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export function TopBar() {
  const { usage } = useStore();
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());

  const toggleTheme = () => {
    const next: Theme = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark';
    setTheme(next);
    setCurrentTheme(next);
  };

  const themeIcon = currentTheme === 'dark' ? '🌙' : currentTheme === 'light' ? '☀️' : '🖥️';

  const running = usage?.activity?.total?.running ?? 0;
  const completed = usage?.activity?.total?.completedToday ?? 0;
  const failed = usage?.activity?.total?.failedToday ?? 0;

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span>OpenClaw Ops</span>
        </div>
        <input
          type="text"
          placeholder="Search tasks, agents..."
          style={styles.search}
          onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
          onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
        />
      </div>

      <div style={styles.right}>
        <div style={styles.chips}>
          {running > 0 && (
            <span className="chip running">
              <span className="status-dot running" /> {running} running
            </span>
          )}
          {completed > 0 && (
            <span className="chip completed">✓ {completed} today</span>
          )}
          {failed > 0 && (
            <span className="chip failed">✗ {failed} failed</span>
          )}
          {running === 0 && completed === 0 && failed === 0 && (
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No activity today</span>
          )}
        </div>

        <button style={styles.themeBtn} onClick={toggleTheme} title={`Theme: ${currentTheme}`}>
          {themeIcon}
        </button>
      </div>
    </div>
  );
}
