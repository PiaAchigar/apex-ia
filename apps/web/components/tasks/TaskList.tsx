"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { CheckSquare, Plus, Loader2, ClipboardList } from "lucide-react";

type TaskStatus = "pending" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedAgentId: string | null;
  createdAt: string | null;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Completada",
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TaskList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (priorityFilter) params.set("priority", priorityFilter);

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ["tasks", statusFilter, priorityFilter],
    queryFn: () => apiClient.get<Task[]>(`/tasks?${params}`),
    staleTime: 30_000,
  });

  async function handleComplete(taskId: string) {
    await apiClient.post(`/tasks/${taskId}/complete`, {});
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      await apiClient.post("/tasks", {
        title: newTitle.trim(),
        priority: newPriority,
        dueDate: newDueDate || null,
      });
      setNewTitle("");
      setNewPriority("medium");
      setNewDueDate("");
      setShowNewForm(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap px-6 py-4 border-b border-[#374151]">
        <h1 className="text-lg font-semibold text-white mr-2">Tareas</h1>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
          className="bg-[#1F2937] border border-[#374151] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="done">Completadas</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}
          className="bg-[#1F2937] border border-[#374151] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Filtrar por prioridad"
        >
          <option value="">Todas las prioridades</option>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>

        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nueva tarea
        </button>
      </div>

      {/* New task inline form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateTask}
          className="flex items-center gap-3 flex-wrap px-6 py-3 border-b border-[#374151] bg-[#1F2937]"
          aria-label="Formulario nueva tarea"
        >
          <input
            type="text"
            placeholder="Título de la tarea"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
            className="flex-1 min-w-[200px] bg-[#111827] border border-[#374151] rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="bg-[#111827] border border-[#374151] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Prioridad"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="bg-[#111827] border border-[#374151] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Fecha de vencimiento"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-1.5 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {isCreating ? "Creando..." : "Crear"}
          </button>
          <button
            type="button"
            onClick={() => setShowNewForm(false)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] transition-colors"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" aria-label="Cargando" />
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16 text-red-400 text-sm">
            Error al cargar las tareas
          </div>
        )}

        {!isLoading && !isError && (tasks ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <ClipboardList className="w-10 h-10 text-gray-600" aria-hidden="true" />
            <p className="text-gray-400 font-medium">No hay tareas</p>
            <p className="text-gray-600 text-sm max-w-xs">
              Creá tu primera tarea usando el botón "Nueva tarea".
            </p>
          </div>
        )}

        {!isLoading && !isError && (tasks ?? []).length > 0 && (
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-[#1F2937] border-b border-[#374151]">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-400">Título</th>
                <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Prioridad</th>
                <th className="px-4 py-3 font-medium text-gray-400">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Vencimiento</th>
                <th className="px-4 py-3 font-medium text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((task) => (
                <tr
                  key={task.id}
                  className={`border-b border-[#374151]/50 transition-colors ${
                    task.status === "done" ? "opacity-60" : "hover:bg-[#1F2937]"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-200">
                    <span className={task.status === "done" ? "line-through text-gray-500" : ""}>
                      {task.title}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_CLASSES[task.priority]}`}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASSES[task.status]}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {formatDate(task.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    {task.status !== "done" && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                        Completar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
