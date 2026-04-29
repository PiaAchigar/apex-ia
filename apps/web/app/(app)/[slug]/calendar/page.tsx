"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CalendarView } from "@/components/calendar/CalendarView";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/hooks/useAuth";

export default function CalendarPage() {
  const params = useParams();
  const { user } = useAuth();
  const slug = params.slug as string;

  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  const { events, isLoading, create, update, delete: deleteEvent } =
    useCalendarEvents(user?.userId || "", startDate, endDate);

  const handleCreateEvent = (date: string) => {
    const title = prompt("Título del evento:");
    if (!title) return;

    const startAt = new Date(date);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 hora por defecto

    create({
      title,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: false,
    }).catch(console.error);
  };

  const handleEditEvent = (event: typeof events[0]) => {
    const newTitle = prompt("Nuevo título:", event.title);
    if (!newTitle || newTitle === event.title) return;

    update({
      id: event.id,
      data: { title: newTitle },
    }).catch(console.error);
  };

  const handleDeleteEvent = (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) return;
    deleteEvent(id).catch(console.error);
  };

  const handleSyncGoogle = () => {
    // TODO: Implementar OAuth flow con Google Calendar
    alert("Sincronización con Google Calendar — próximamente");
  };

  return (
    <div className="h-full bg-[#111827] overflow-auto">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Calendario</h1>
          <p className="text-[#9CA3AF]">
            Gestiona tus eventos y citas con los contactos
          </p>
        </div>

        <CalendarView
          events={events}
          onCreateEvent={handleCreateEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onSyncGoogle={handleSyncGoogle}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
