"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider as TanStackProvider } from "@tanstack/react-query";

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return <TanStackProvider client={queryClient}>{children}</TanStackProvider>;
}
