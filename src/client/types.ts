// Shared types for the OpenClaw Dashboard

export interface Business {
  id: string;
  name: string;
  url: string;
  tagline: string;
  color: string;
  icon: string;
  root: string;
  agents: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  business_id: string | null;
  path: string;
  model: string;
  memory_files: string[];
  // Live status (from API)
  status?: 'running' | 'idle' | 'error' | 'offline';
  lastActivity?: number | null;
}

export type CardStatus = 'backlog' | 'todo' | 'running' | 'done';

export interface Card {
  id: string;
  business_id: string;
  title: string;
  prompt: string;
  agent_id: string | null;
  status: CardStatus;
  blocked: boolean;
  outcome: string | null;
  task_run_id: string | null;
  created_at: number;
  dispatched_at: number | null;
  ended_at: number | null;
}

export interface DashboardState {
  version: number;
  core: {
    workspace: string;
    shared_memory: string;
  };
  businesses: Business[];
  pool: string[];
  agents: Agent[];
  cards: Card[];
}

export interface UsageData {
  activity: {
    total: { running: number; completedToday: number; failedToday: number };
    byBusiness: Record<string, { running: number; completedToday: number; failedToday: number }>;
  };
  lastSeen: number;
}

export interface SSEEvent {
  type: 'card.updated' | 'run.event' | 'usage.changed' | 'agents.changed' | 'state.changed';
  data: unknown;
}
