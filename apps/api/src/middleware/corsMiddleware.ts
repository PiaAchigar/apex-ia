import { cors } from 'hono/cors'
import type { Context } from 'hono'

// Dominios permitidos según ambiente
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV

  if (env === 'development' || env === 'test') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ]
  }

  if (env === 'staging') {
    return [
      'https://staging.apexia.com',
      'https://app-staging.apexia.com',
    ]
  }

  // production
  return [
    'https://app.apexia.com',
    'https://apexia.com',
    'https://www.apex-ia.com.ar'
  ]
}

export const corsMiddleware = cors({
  origin: getAllowedOrigins(),
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ],
  exposeHeaders: [
    'Content-Length',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 600, // 10 minutos
})