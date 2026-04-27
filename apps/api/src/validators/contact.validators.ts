import { z } from 'zod'

export const searchContactSchema = z.object({
  query: z.string()
    .min(1, 'Query requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  offset: z.number()
    .int()
    .min(0)
    .default(0),
})

export const createContactSchema = z.object({
  name: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Formato de teléfono inválido')
    .optional(),
  customFieldsJson: z.record(z.unknown())
    .optional()
    .refine(
      (obj) => !obj || Object.keys(obj).length <= 50,
      'Máximo 50 campos custom'
    ),
})

export type SearchContactInput = z.infer<typeof searchContactSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
