// Simple toast notification system using browser events
export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

const listeners = new Set<(toast: Toast) => void>();

export const toast = {
  show: (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toastObj: Toast = { id, message, type, duration };
    listeners.forEach((listener) => listener(toastObj));
  },

  success: (message: string, duration?: number) => {
    toast.show(message, 'success', duration);
  },

  error: (message: string, duration?: number) => {
    toast.show(message, 'error', duration);
  },

  info: (message: string, duration?: number) => {
    toast.show(message, 'info', duration);
  },

  subscribe: (listener: (toast: Toast) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
