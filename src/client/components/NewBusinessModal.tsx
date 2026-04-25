import { useState } from 'preact/hooks';
import { useStore } from '../store';

const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#7dd3fc', // light blue
  '#a78bfa', // purple
];

const ICONS = ['▣', '◆', '●', '★', '▲', '◉', '⬡', '⬢', '◈', '◇'];

const styles = {
  slugPreview: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    marginTop: '2px',
    padding: '2px 6px',
    background: 'var(--bg-primary)',
    borderRadius: '3px',
    display: 'inline-block',
  },
  colorGrid: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  colorBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all var(--transition)',
  },
  iconGrid: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  iconBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    transition: 'all var(--transition)',
    background: 'var(--bg-surface)',
  },
};

interface Props {
  onClose: () => void;
}

export function NewBusinessModal({ onClose }: Props) {
  const { createBusiness } = useStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [creating, setCreating] = useState(false);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await createBusiness({ name: name.trim(), url: url.trim(), tagline: tagline.trim(), color, icon });
      onClose();
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>New Business</h2>

        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. Scube Housing"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          {slug && <span style={styles.slugPreview}>{slug}</span>}
        </div>

        <div className="form-group">
          <label>Website (optional)</label>
          <input
            type="text"
            value={url}
            onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="e.g. scubehousing.com"
          />
        </div>

        <div className="form-group">
          <label>Tagline (optional)</label>
          <input
            type="text"
            value={tagline}
            onInput={(e) => setTagline((e.target as HTMLInputElement).value)}
            placeholder="e.g. student accommodation"
          />
        </div>

        <div className="form-group">
          <label>Color</label>
          <div style={styles.colorGrid}>
            {COLORS.map(c => (
              <button
                key={c}
                style={{
                  ...styles.colorBtn,
                  background: c,
                  borderColor: c === color ? 'white' : 'transparent',
                  transform: c === color ? 'scale(1.15)' : 'scale(1)',
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Icon</label>
          <div style={styles.iconGrid}>
            {ICONS.map(i => (
              <button
                key={i}
                style={{
                  ...styles.iconBtn,
                  borderColor: i === icon ? 'var(--accent)' : 'var(--border)',
                  background: i === icon ? 'var(--accent-muted)' : 'var(--bg-surface)',
                  color: i === icon ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {name && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius)',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              background: color + '22',
              color: color,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {url && <span>{url}</span>}
                {url && tagline && <span> · </span>}
                {tagline && <span>{tagline}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? 'Creating...' : 'Create Business'}
          </button>
        </div>
      </div>
    </div>
  );
}
