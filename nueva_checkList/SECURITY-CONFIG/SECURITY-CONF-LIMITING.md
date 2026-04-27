**Crear (si aun no existe):** `apps/api/src/middleware/rateLimitMiddleware.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { Context, Next } from 'hono'

const redis = Redis.fromEnv()

// Diferentes límites según endpoint
const limiterConfigs = {
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
  }),
  
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 intentos/15 min
  }),
  
  setup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 intentos/15 min
  }),
  
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 búsquedas/minuto
  }),
}

export const getRateLimiter = (type: keyof typeof limiterConfigs) => {
  return limiterConfigs[type] || limiterConfigs.default
}

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const ip = c.req.header('x-forwarded-for') || 
             c.req.header('cf-connecting-ip') || 
             '0.0.0.0'
  
  const limiter = getRateLimiter('default')
  const { success, limit, remaining, reset } = await limiter.limit(`ip:${ip}`)
  
  // Agregar headers
  c.header('X-RateLimit-Limit', limit.toString())
  c.header('X-RateLimit-Remaining', Math.max(0, remaining).toString())
  c.header('X-RateLimit-Reset', reset.toString())
  
  if (!success) {
    return c.json(
      { error: 'Too many requests. Please try again later.' },
      429
    )
  }
  
  return next()
}

// Middleware específico para endpoints sensibles
export const createRateLimitMiddleware = (type: keyof typeof limiterConfigs) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || '0.0.0.0'
    const limiter = getRateLimiter(type)
    
    const { success, limit, remaining, reset } = await limiter.limit(`${type}:${ip}`)
    
    c.header('X-RateLimit-Limit', limit.toString())
    c.header('X-RateLimit-Remaining', Math.max(0, remaining).toString())
    c.header('X-RateLimit-Reset', reset.toString())
    
    if (!success) {
      return c.json(
        { error: 'Too many requests. Please try again later.' },
        429
      )
    }
    
    return next()
  }
}
```

**En rutas:**

```typescript
import { createRateLimitMiddleware } from './middleware/rateLimitMiddleware'

// Proteger auth
router.post('/auth/register',
  createRateLimitMiddleware('auth'),
  async (c) => { /* ... */ }
)

// Proteger setup
router.post('/setup/validate-database',
  createRateLimitMiddleware('setup'),
  async (c) => { /* ... */ }
)

// Proteger búsquedas
router.get('/contacts/search',
  createRateLimitMiddleware('search'),
  async (c) => { /* ... */ }
)
```
