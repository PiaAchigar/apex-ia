import type { Context, Next } from 'hono'

export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co https://api.anthropic.com https://api.openai.com;"
  )

  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  if (c.req.path.startsWith('/api/') || !c.req.path.startsWith('/health')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    c.header('Pragma', 'no-cache')
    c.header('Expires', '0')
  }

  return next()
}
