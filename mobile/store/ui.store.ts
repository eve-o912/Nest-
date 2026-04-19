import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UIState {
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Toast notifications
  toasts: Toast[];
  
  // Modal states
  activeModal: string | null;
  
  // Actions
  setLoading: (isLoading: boolean, message?: string) => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  clearAllToasts: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isLoading: false,
  loadingMessage: '',
  toasts: [],
  activeModal: null,

  // Set loading state
  setLoading: (isLoading, message = '') => {
    set({ isLoading, loadingMessage: message });
  },

  // Show toast
  showToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, message, type };
    
    set({ toasts: [...get().toasts, toast] });
    
    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      get().hideToast(id);
    }, 2500);
  },

  // Hide toast
  hideToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  // Open modal
  openModal: (modalId) => {
    set({ activeModal: modalId });
  },

  // Close modal
  closeModal: () => {
    set({ activeModal: null });
  },

  // Clear all toasts
  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));
