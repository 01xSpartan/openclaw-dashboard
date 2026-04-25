import { create } from 'zustand';
import type { DashboardState, Agent, Card, UsageData, Business, CardStatus } from './types';
import * as api from './api';

interface DashboardStore {
  // State
  state: DashboardState | null;
  agents: Agent[];
  usage: UsageData | null;
  selectedBusinessId: string | null;
  selectedCardId: string | null;
  selectedAgentId: string | null;
  loading: boolean;
  error: string | null;
  connected: boolean;

  // Actions
  loadState: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadUsage: () => Promise<void>;
  selectBusiness: (id: string | null) => void;
  selectCard: (id: string | null) => void;
  selectAgent: (id: string | null) => void;
  createBusiness: (data: { name: string; url?: string; tagline?: string; color?: string; icon?: string }) => Promise<void>;
  deleteBusiness: (id: string) => Promise<void>;
  createCard: (data: { business_id: string; title: string; prompt?: string; agent_id?: string; status?: string }) => Promise<void>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (id: string, status: CardStatus) => Promise<void>;
  dispatchCard: (id: string) => Promise<void>;
  retryCard: (id: string) => Promise<void>;
  killCard: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;
  handleSSEEvent: (event: string, data: unknown) => void;
}

export const useStore = create<DashboardStore>((set, get) => ({
  state: null,
  agents: [],
  usage: null,
  selectedBusinessId: null,
  selectedCardId: null,
  selectedAgentId: null,
  loading: true,
  error: null,
  connected: false,

  loadState: async () => {
    try {
      const state = await api.getState();
      set({ state, loading: false, error: null });
      // Auto-select first business if none selected
      if (!get().selectedBusinessId && state.businesses.length > 0) {
        set({ selectedBusinessId: state.businesses[0].id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load state';
      set({ error: msg, loading: false });
    }
  },

  loadAgents: async () => {
    try {
      const agents = await api.getAgents();
      set({ agents });
    } catch { /* silent */ }
  },

  loadUsage: async () => {
    try {
      const usage = await api.getUsage();
      set({ usage });
    } catch { /* silent */ }
  },

  selectBusiness: (id) => set({ selectedBusinessId: id, selectedCardId: null, selectedAgentId: null }),
  selectCard: (id) => set({ selectedCardId: id }),
  selectAgent: (id) => set({ selectedAgentId: id }),

  createBusiness: async (data) => {
    try {
      await api.createBusiness(data);
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create business';
      set({ error: msg });
    }
  },

  deleteBusiness: async (id) => {
    try {
      await api.deleteBusiness(id);
      if (get().selectedBusinessId === id) set({ selectedBusinessId: null });
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete business';
      set({ error: msg });
    }
  },

  createCard: async (data) => {
    try {
      await api.createCard(data);
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create card';
      set({ error: msg });
    }
  },

  updateCard: async (id, patch) => {
    try {
      await api.updateCard(id, patch);
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update card';
      set({ error: msg });
    }
  },

  deleteCard: async (id) => {
    try {
      await api.deleteCard(id);
      if (get().selectedCardId === id) set({ selectedCardId: null });
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete card';
      set({ error: msg });
    }
  },

  moveCard: async (id, status) => {
    await get().updateCard(id, { status });
  },

  dispatchCard: async (id) => {
    try {
      await api.dispatchCard(id);
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dispatch failed';
      set({ error: msg });
    }
  },

  retryCard: async (id) => {
    try {
      await api.retryCard(id);
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed';
      set({ error: msg });
    }
  },

  killCard: async (id) => {
    try {
      await api.killCard(id);
      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kill failed';
      set({ error: msg });
    }
  },

  setError: (error) => set({ error }),
  setConnected: (connected) => set({ connected }),

  handleSSEEvent: (event, _data) => {
    // Refresh state on any change
    if (event === 'state.changed' || event === 'card.updated') {
      get().loadState();
    }
    if (event === 'agents.changed') {
      get().loadAgents();
    }
    if (event === 'usage.changed') {
      get().loadUsage();
    }
  },
}));
