const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

type FetchOptions = RequestInit & {
  token?: string;
};

class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new ApiError(
      data.error?.code ?? "UNKNOWN_ERROR",
      data.error?.message ?? "Error desconocido",
      res.status
    );
  }

  return data.data as T;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("apex_access_token");
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    apiFetch<T>(path, { method: "GET", token: token ?? getStoredToken() ?? undefined }),

  post: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      token: token ?? getStoredToken() ?? undefined,
    }),

  patch: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      token: token ?? getStoredToken() ?? undefined,
    }),

  delete: <T>(path: string, token?: string) =>
    apiFetch<T>(path, { method: "DELETE", token: token ?? getStoredToken() ?? undefined }),
};

export { ApiError };
