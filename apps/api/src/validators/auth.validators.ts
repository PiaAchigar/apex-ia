import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres')
    .regex(/[A-Z]/, 'Debe contener mayúscula')
    .regex(/[a-z]/, 'Debe contener minúscula')
    .regex(/[0-9]/, 'Debe contener número')
    .regex(/[!@#$%^&*]/, 'Debe contener símbolo especial'),
  organizationName: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
})

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password requerido'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
