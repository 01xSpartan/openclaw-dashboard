import { useEffect } from 'preact/hooks';
import { useStore } from './store';
import { connectSSE, onSSE } from './sse';
import { AppShell } from './components/AppShell';

export function App() {
  const { loadState, loadAgents, loadUsage, handleSSEEvent, setConnected } = useStore();

  useEffect(() => {
    // Initial load
    loadState();
    loadAgents();
    loadUsage();

    // Connect SSE
    connectSSE();
    setConnected(true);

    const unsub = onSSE((event, data) => {
      handleSSEEvent(event, data);
    });

    return () => {
      unsub();
    };
  }, []);

  return <AppShell />;
}
