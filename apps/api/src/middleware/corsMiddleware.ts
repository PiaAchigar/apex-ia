import { cors } from 'hono/cors'
import type { Context } from 'hono'

// Dominios permitidos según ambiente
// Validar IP de n8n también - agregar
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
      // IP de máquina en red local para testing externo
      'http://192.168.0.17:3000',
      'http://192.168.0.17:3001',
      'http://192.168.0.17:3002',
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
    'https://crm.complexa.com.ar',
    'https://www.crm.complexa.com.ar',
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