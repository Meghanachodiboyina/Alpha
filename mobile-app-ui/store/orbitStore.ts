import { create } from 'zustand';
import { OrbitMsg } from '../components/orbit/orbitTypes';

export type ThinkingPhase = 'idle' | 'understanding' | 'identifying' | 'validating' | 'creating';

interface OrbitState {
  conversationId: number | null;
  messages: OrbitMsg[];
  isThinking: boolean;
  thinkingPhase: ThinkingPhase;
  status: 'WAITING_FOR_INPUT' | 'WAITING_FOR_CLARIFICATION' | 'READY_TO_GENERATE' | 'GENERATING' | 'COMPLETE' | 'ERROR';

  setConversationId: (id: number | null) => void;
  setMessages: (messages: OrbitMsg[]) => void;
  addMessages: (messages: OrbitMsg[]) => void;
  setIsThinking: (isThinking: boolean) => void;
  setThinkingPhase: (phase: ThinkingPhase) => void;
  setStatus: (status: 'WAITING_FOR_INPUT' | 'WAITING_FOR_CLARIFICATION' | 'READY_TO_GENERATE' | 'GENERATING' | 'COMPLETE' | 'ERROR') => void;
  resetStore: () => void;
}

export const useOrbitStore = create<OrbitState>((set) => ({
  conversationId: null,
  messages: [],
  isThinking: false,
  thinkingPhase: 'idle',
  status: 'WAITING_FOR_INPUT',

  setConversationId: (id: number | null) => set({ conversationId: id }),
  setMessages: (messages: OrbitMsg[]) => set({ messages }),
  addMessages: (newMessages: OrbitMsg[]) => set((state: OrbitState) => ({ messages: [...state.messages, ...newMessages] })),
  setIsThinking: (isThinking: boolean) => set({ isThinking }),
  setThinkingPhase: (thinkingPhase: ThinkingPhase) => set({ thinkingPhase }),
  setStatus: (status: 'WAITING_FOR_INPUT' | 'WAITING_FOR_CLARIFICATION' | 'READY_TO_GENERATE' | 'GENERATING' | 'COMPLETE' | 'ERROR') => set({ status }),
  resetStore: () => set({
    conversationId: null,
    messages: [],
    isThinking: false,
    thinkingPhase: 'idle',
    status: 'WAITING_FOR_INPUT'
  }),
}));
