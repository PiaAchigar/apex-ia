import { z } from 'zod'

export const connectDatabaseSchema = z.object({
  supabaseUrl: z.string()
    .url('URL inválida')
    .regex(/https:\/\/.*\.supabase\.co/, 'Debe ser URL de Supabase')
    .trim(),
  supabaseKey: z.string()
    .min(50, 'API Key inválida')
    .max(500, 'API Key inválida')
    .trim()
    .refine(
      (key) => !key.includes('service_role'),
      'Usa la key "anon", no "service_role"'
    ),
})

export const validateDatabaseSchema = z.object({
  supabaseUrl: connectDatabaseSchema.shape.supabaseUrl,
  supabaseKey: connectDatabaseSchema.shape.supabaseKey,
})

export type ConnectDatabaseInput = z.infer<typeof connectDatabaseSchema>
export type ValidateDatabaseInput = z.infer<typeof validateDatabaseSchema>
