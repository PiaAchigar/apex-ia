"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  contactId?: string;
  agentId?: string;
  googleEventId?: string;
  location?: string;
  createdAt: string;
}

export interface CalendarEventsResponse {
  data: CalendarEvent[];
}

export function useCalendarEvents(
  agentId: string,
  startDate?: string,
  endDate?: string
) {
  const queryClient = useQueryClient();
  const queryKey = ["calendar-events", { agentId, startDate, endDate }];

  const query = useQuery<CalendarEvent[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        agentId,
        ...(startDate ? { start: startDate } : {}),
        ...(endDate ? { end: endDate } : {}),
      });
      const response = await apiClient.get<CalendarEventsResponse>(
        `/calendar/events?${params}`
      );
      return response.data || [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (input: Omit<CalendarEvent, "id" | "createdAt">) =>
      apiClient.post<CalendarEvent>("/calendar/events", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<CalendarEvent> }) =>
      apiClient.patch<CalendarEvent>(`/calendar/events/${input.id}`, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}
