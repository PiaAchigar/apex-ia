**Crear(si aun no existe):** `apps/api/src/middleware/securityHeadersMiddleware.ts`

```typescript
import type { Context, Next } from 'hono'

export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  // Content Security Policy: prevenir XSS, clickjacking, etc.
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co https://api.anthropic.com https://api.openai.com;"
  )
  
  // X-Frame-Options: prevenir clickjacking
  c.header('X-Frame-Options', 'DENY')
  
  // X-Content-Type-Options: prevenir sniffing
  c.header('X-Content-Type-Options', 'nosniff')
  
  // Strict-Transport-Security: forzar HTTPS
  c.header(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  
  // Referrer-Policy: controlar información de referrer
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions-Policy: desactivar features peligrosas
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  
  // Cache-Control: no cachear datos sensibles
  if (c.req.path.includes('/api/')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    c.header('Pragma', 'no-cache')
    c.header('Expires', '0')
  }
  
  return next()
}
```

**En `apps/api/src/index.ts`:**

```typescript
app.use(securityHeadersMiddleware)
```
