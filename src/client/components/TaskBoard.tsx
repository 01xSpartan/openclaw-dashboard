import { useStore } from '../store';
import { TaskCard } from './TaskCard';
import { useState } from 'preact/hooks';
import type { CardStatus } from '../types';

const columns: { key: CardStatus; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'var(--text-muted)' },
  { key: 'todo', label: 'Todo', color: 'var(--accent)' },
  { key: 'running', label: 'Running', color: 'var(--success)' },
  { key: 'done', label: 'Done', color: 'var(--text-secondary)' },
];

const styles = {
  board: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    height: '100%',
    overflow: 'auto',
  },
  column: {
    flex: 1,
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  colHeader: {
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  colTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  colCount: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--bg-hover)',
    padding: '1px 6px',
    borderRadius: '8px',
    fontWeight: 500,
  },
  colBody: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  quickAdd: {
    padding: '8px',
    borderTop: '1px solid var(--border-subtle)',
  },
  quickInput: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  },
  dropTarget: {
    border: '2px dashed var(--accent)',
    background: 'var(--accent-muted)',
    borderRadius: 'var(--radius)',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
    fontSize: '12px',
    margin: '4px',
  },
  emptyCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 12px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    textAlign: 'center' as const,
    opacity: 0.6,
  },
};

interface Props {
  businessId: string;
}

export function TaskBoard({ businessId }: Props) {
  const { state, createCard, moveCard } = useStore();
  const [quickAddCol, setQuickAddCol] = useState<CardStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null);

  const cards = (state?.cards ?? []).filter(c => c.business_id === businessId);

  const handleQuickAdd = async (status: CardStatus) => {
    if (!quickTitle.trim()) return;
    await createCard({
      business_id: businessId,
      title: quickTitle.trim(),
      status,
    });
    setQuickTitle('');
    setQuickAddCol(null);
  };

  const handleDragStart = (cardId: string) => {
    setDragCardId(cardId);
  };

  const handleDragOver = (e: DragEvent, col: CardStatus) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDrop = async (col: CardStatus) => {
    if (dragCardId) {
      await moveCard(dragCardId, col);
    }
    setDragCardId(null);
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    setDragCardId(null);
    setDragOverCol(null);
  };

  return (
    <div style={styles.board}>
      {columns.map(col => {
        const colCards = cards.filter(c => c.status === col.key);
        const isDragOver = dragOverCol === col.key;

        return (
          <div
            key={col.key}
            style={{
              ...styles.column,
              ...(isDragOver ? { outline: '2px solid var(--accent)', outlineOffset: '-2px' } : {}),
            }}
            onDragOver={(e) => handleDragOver(e as DragEvent, col.key)}
            onDrop={() => handleDrop(col.key)}
            onDragLeave={() => setDragOverCol(null)}
          >
            <div style={styles.colHeader}>
              <span style={styles.colTitle}>
                <span style={{ ...styles.colDot, background: col.color }} />
                {col.label}
              </span>
              <span style={styles.colCount}>{colCards.length}</span>
            </div>

            <div style={styles.colBody}>
              {colCards.map(card => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: dragCardId === card.id ? 0.5 : 1 }}
                >
                  <TaskCard card={card} />
                </div>
              ))}

              {colCards.length === 0 && !isDragOver && (
                <div style={styles.emptyCol}>
                  {col.key === 'backlog' ? 'Add tasks to get started' :
                   col.key === 'todo' ? 'Move tasks here to schedule' :
                   col.key === 'running' ? 'Dispatch tasks to run' :
                   'Completed tasks appear here'}
                </div>
              )}

              {isDragOver && colCards.length === 0 && (
                <div style={styles.dropTarget}>Drop here</div>
              )}
            </div>

            <div style={styles.quickAdd}>
              {quickAddCol === col.key ? (
                <input
                  type="text"
                  value={quickTitle}
                  onInput={(e) => setQuickTitle((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAdd(col.key);
                    if (e.key === 'Escape') { setQuickAddCol(null); setQuickTitle(''); }
                  }}
                  onBlur={() => { if (!quickTitle) setQuickAddCol(null); }}
                  placeholder="Task title..."
                  autoFocus
                  style={styles.quickInput}
                />
              ) : (
                <button
                  style={{
                    ...styles.quickInput,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    textAlign: 'left' as const,
                    border: '1px dashed var(--border)',
                    background: 'transparent',
                  }}
                  onClick={() => setQuickAddCol(col.key)}
                >
                  + Add card
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
