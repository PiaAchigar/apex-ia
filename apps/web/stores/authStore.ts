import { create } from "zustand";
import type { PermissionsJson } from "@/lib/permissions";

type AuthUser = {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  roleId: string;
  roleName: string;
  permissions: PermissionsJson;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;

  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  clearAuth: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("apex_access_token");
      sessionStorage.removeItem("apex_refresh_token");
      sessionStorage.removeItem("apex_org_slug");
    }
    set({ user: null, isLoading: false });
  },
}));

export type { AuthUser };
