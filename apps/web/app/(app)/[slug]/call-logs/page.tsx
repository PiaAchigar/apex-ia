"use client";

import { useState } from "react";
import { CallLogTable } from "@/components/call-logs/CallLogTable";
import { useCallLogs } from "@/hooks/useCallLogs";

export default function CallLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data: logsData, isLoading } = useCallLogs(page, limit);

  // Extract data from response
  const logs = logsData?.data || [];
  const total = logsData?.total || 0;

  return (
    <div className="h-full bg-[#111827] overflow-auto">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Registros de Llamadas</h1>
          <p className="text-[#9CA3AF]">
            Historial de llamadas de IA y transcripciones
          </p>
        </div>

        <CallLogTable
          logs={logs}
          page={page}
          onPageChange={setPage}
          total={total}
          limit={limit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
