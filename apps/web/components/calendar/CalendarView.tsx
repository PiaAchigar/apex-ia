"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Plus, X } from "lucide-react";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

type CalendarViewProps = {
  events: CalendarEvent[];
  onCreateEvent: (date: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onSyncGoogle: () => void;
  isLoading?: boolean;
};

export function CalendarView({
  events,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onSyncGoogle,
  isLoading = false,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthName = currentDate.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, () => null);

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return events.filter((event) =>
      event.startAt.startsWith(dateStr)
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onCreateEvent(dateStr);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold capitalize min-w-[200px]">
            {monthName}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onSyncGoogle}
          className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-medium transition-colors"
        >
          Sincronizar Google
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#1F2937] rounded-lg p-4 overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"].map((day) => (
            <div key={day} className="h-12 flex items-center justify-center">
              <span className="text-sm font-semibold text-[#9CA3AF]">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-24 bg-[#111827] rounded-lg border border-[#374151]"
            />
          ))}

          {days.map((day) => {
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className="h-24 bg-[#111827] border border-[#374151] rounded-lg p-2 cursor-pointer hover:border-[#10B981] transition-colors overflow-hidden"
              >
                <div className="text-xs font-medium mb-1 text-[#9CA3AF]">
                  {day}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[60px]">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="text-xs px-2 py-1 rounded bg-[#10B981] text-white truncate cursor-pointer hover:bg-[#059669]"
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-[#374151] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEvent.description && (
              <p className="text-sm text-[#D1D5DB] mb-3">
                {selectedEvent.description}
              </p>
            )}

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Hora:</span>
                <span>
                  {new Date(selectedEvent.startAt).toLocaleString("es-AR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Ubicación:</span>
                  <span>{selectedEvent.location}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  onEditEvent(selectedEvent);
                  setSelectedEvent(null);
                }}
                className="flex-1 px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-medium transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  onDeleteEvent(selectedEvent.id);
                  setSelectedEvent(null);
                }}
                className="flex-1 px-3 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-[#9CA3AF]">Cargando eventos...</div>
      )}
    </div>
  );
}
