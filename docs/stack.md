## Stack Tecnológico

### Frontend
| Librería | Uso |
|---|---|
| Next.js 15 (App Router) | SSR para landing, CSR para dashboard |
| TypeScript strict | Sin `any` en todo el proyecto |
| Tailwind CSS 4 + shadcn/ui | Design system, dark theme por defecto |
| Zustand | Estado global liviano |
| TanStack Query v5 | Server state, caché automático, sincronización |
| Socket.io-client | Real-time inbox bidireccional |
| React Hook Form + Zod | Formularios y validación |
| Recharts | Gráficos y analytics |
| @xyflow/react | Flow Builder visual drag-and-drop |

### Backend
| Librería | Uso |
|---|---|
| Hono.js | API REST + WebSockets, TypeScript-first, ~40KB |
| Drizzle ORM | Type-safe, migraciones versionadas, apunta a Supabase |
| Redis (Upstash) | Caché, sesiones, pub/sub, rate limiting |
| BullMQ | Colas async: campaigns, notificaciones, tareas AI |
| Socket.io | Real-time WebSocket + polling fallback |
| Zod | Validación server-side |
| pino | Logging estructurado |