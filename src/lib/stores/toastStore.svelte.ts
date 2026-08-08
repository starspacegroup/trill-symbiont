/** Simple toast notification store using Svelte 5 runes */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

let nextId = 0;
let toasts = $state<Toast[]>([]);

export function getToasts(): Toast[] {
  return toasts;
}

export function addToast(message: string, type: ToastType = 'info', duration = 4000): void {
  const id = nextId++;
  toasts.push({ id, message, type, duration });

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
}

export function removeToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
}

export function clearToasts(): void {
  toasts = [];
}
