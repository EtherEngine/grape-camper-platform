import { create } from 'zustand';

let nextId = 1;

const useUiStore = create((set, get) => ({
  /* ── Toasts ────────────────────────────────────────────── */
  toasts: [],

  /**
   * Add a toast notification.
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} message
   * @param {number} [duration=4000] ms — 0 = sticky
   */
  addToast(type, message, duration = 4000) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
  },

  removeToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  /* convenience wrappers */
  toastSuccess(msg, dur) { get().addToast('success', msg, dur); },
  toastError(msg, dur)   { get().addToast('error', msg, dur ?? 6000); },
  toastWarning(msg, dur) { get().addToast('warning', msg, dur); },
  toastInfo(msg, dur)    { get().addToast('info', msg, dur); },

  /* ── Global loading overlay ────────────────────────────── */
  globalLoading: false,
  globalLoadingText: '',

  setGlobalLoading(active, text = '') {
    set({ globalLoading: active, globalLoadingText: text });
  },
}));

export default useUiStore;