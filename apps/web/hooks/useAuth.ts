import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  const session = user
    ? {
        access_token: user.accessToken,
        refresh_token: user.refreshToken,
        user: {
          id: user.userId,
          email: "", // Puede extraerse de API si es necesario
        },
      }
    : null;

  return { session, user, isLoading };
}
