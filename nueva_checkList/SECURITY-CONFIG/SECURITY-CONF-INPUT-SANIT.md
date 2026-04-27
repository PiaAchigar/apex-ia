**Crear(si aun no existe):** `apps/api/src/utils/sanitize.ts`

```typescript
export const sanitizeString = (str: string, maxLength = 255): string => {
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remover < y >
}

export const sanitizeObject = (obj: Record<string, any>) => {
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
```
