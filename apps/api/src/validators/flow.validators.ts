import { z } from 'zod'

export const FORBIDDEN_PATTERNS = [
  'eval',
  'Function',
  '__import__',
  'require',
  'exec',
  'spawn',
  'system',
  'process',
  'child_process',
  'fs.',
  'os.',
]

const noDangerousCode = (value: string) =>
  !FORBIDDEN_PATTERNS.some(word => value.toLowerCase().includes(word.toLowerCase()))

const triggerNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('TriggerNode'),
  data: z.object({
    triggerType: z.enum(['incoming_message', 'keyword', 'scheduled']),
    keyword: z.string().max(100).optional(),
  }),
})

const conditionNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('ConditionNode'),
  data: z.object({
    condition: z.string()
      .min(1)
      .max(500)
      .refine(noDangerousCode, 'Código no permitido en condición'),
    operator: z.enum(['==', '!=', '>', '<', '&&', '||']),
    value: z.string().max(100),
  }),
})

const sendMessageNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('SendMessageNode'),
  data: z.object({
    content: z.string()
      .min(1)
      .max(5000)
      .refine(noDangerousCode, 'Código no permitido en mensaje'),
    includeMedia: z.boolean().optional(),
  }),
})

const delayNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('DelayNode'),
  data: z.object({
    delaySeconds: z.number().int().min(1).max(86400),
  }),
})

const aiResponseNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('AiResponseNode'),
  data: z.object({
    prompt: z.string()
      .min(1)
      .max(5000)
      .refine(noDangerousCode, 'Código no permitido en prompt'),
    model: z.enum(['claude-3-haiku', 'gpt-4o', 'gemini-pro']),
  }),
})

const flowNodeSchema = z.union([
  triggerNodeSchema,
  conditionNodeSchema,
  sendMessageNodeSchema,
  delayNodeSchema,
  aiResponseNodeSchema,
])

export const createFlowSchema = z.object({
  name: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  triggerType: z.enum(['incoming_message', 'keyword', 'scheduled']),
  nodes: z.array(flowNodeSchema)
    .min(1, 'Flow debe tener al menos 1 nodo')
    .max(100, 'Flow máximo 100 nodos'),
  edges: z.array(z.object({
    source: z.string().uuid(),
    target: z.string().uuid(),
  }))
    .max(100, 'Máximo 100 conexiones'),
})

export type CreateFlowInput = z.infer<typeof createFlowSchema>

// Escaner de seguridad: recorre los nodos y detecta patrones peligrosos en strings
export function scanNodesForDangerousCode(nodes: unknown[]): string | null {
  const scanValue = (value: unknown): string | null => {
    if (typeof value === 'string') {
      const found = FORBIDDEN_PATTERNS.find(p => value.toLowerCase().includes(p.toLowerCase()))
      return found ?? null
    }
    if (typeof value === 'object' && value !== null) {
      for (const v of Object.values(value)) {
        const result = scanValue(v)
        if (result) return result
      }
    }
    return null
  }

  for (const node of nodes) {
    const result = scanValue(node)
    if (result) return result
  }

  return null
}
