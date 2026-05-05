import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Contraseña mínimo 8 caracteres")
    .max(50, "Contraseña muy larga"),
  fullName: z.string().min(2, "Nombre mínimo 2 caracteres").max(100),
  organizationName: z
    .string()
    .min(2, "Nombre de empresa mínimo 2 caracteres")
    .max(100),
  organizationSlug: z
    .string()
    .min(3, "Slug mínimo 3 caracteres")
    .max(50, "Slug máximo 50 caracteres")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Slug solo puede contener letras minúsculas, números y guiones"
    ),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requerido"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
