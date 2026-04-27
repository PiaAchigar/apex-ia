import { create } from "zustand";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

type UiState = {
  isSidebarCollapsed: boolean;
  activeModal: string | null;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  activeModal: null,
  toasts: [],

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  addToast: (message, type = "info") =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: `toast_${Date.now()}_${Math.random()}`, message, type },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
