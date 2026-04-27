**Crear(si aun no existe):** `apps/api/tests/security/` carpeta

### 6.1 SQL Injection Tests

`apps/api/tests/security/sql-injection.test.ts`

```typescript
describe('SQL Injection Prevention', () => {
  it("debería rechazar input con SQL malicioso", async () => {
    const maliciousInput = "'; DROP TABLE users; --"
    
    // Intentar crear contacto con input malicioso
    const res = await app.request(
      new Request('http://localhost/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: maliciousInput,
          email: 'test@test.com'
        })
      })
    )
    
    // Debería fallar validación
    expect(res.status).toBe(400)
  })
  
  it("debería permitir strings normales", async () => {
    const res = await app.request(
      new Request('http://localhost/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: "John O'Connor",
          email: 'john@example.com'
        })
      })
    )
    
    expect(res.status).toBe(200)
  })
})
```

### 6.2 Code Injection Tests

`apps/api/tests/security/code-injection.test.ts`

```typescript
describe('Code Injection Prevention', () => {
  it("debería rechazar eval en Flow node", async () => {
    const maliciousFlow = {
      name: "Test",
      nodes: [{
        id: '123',
        type: 'ConditionNode',
        data: {
          condition: "eval('__import__(\"os\").system(\"rm -rf /\")')",
          operator: '==',
          value: 'true'
        }
      }]
    }
    
    const res = await app.request(
      new Request('http://localhost/flows', {
        method: 'POST',
        body: JSON.stringify(maliciousFlow)
      })
    )
    
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('no permitido')
  })
  
  it("debería rechazar process.env en mensaje", async () => {
    const maliciousFlow = {
      name: "Test",
      nodes: [{
        id: '123',
        type: 'SendMessageNode',
        data: {
          content: "Hola {{process.env.SECRET_KEY}}"
        }
      }]
    }
    
    const res = await app.request(
      new Request('http://localhost/flows', {
        method: 'POST',
        body: JSON.stringify(maliciousFlow)
      })
    )
    
    expect(res.status).toBe(400)
  })
})
```

### 6.3 Rate Limiting Tests

`apps/api/tests/security/rate-limiting.test.ts`

```typescript
describe('Rate Limiting', () => {
  it("debería permitir N requests dentro del límite", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'wrong'
          }),
          headers: { 'X-Forwarded-For': '192.168.1.1' }
        })
      )
      
      expect([400, 401]).toContain(res.status) // Auth error ok
    }
  })
  
  it("debería rechazar después de N requests", async () => {
    // Hacer 5 requests (límite)
    for (let i = 0; i < 5; i++) {
      await app.request(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'wrong'
          }),
          headers: { 'X-Forwarded-For': '192.168.1.2' }
        })
      )
    }
    
    // Siguiente request debe ser 429
    const res = await app.request(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'wrong'
        }),
        headers: { 'X-Forwarded-For': '192.168.1.2' }
      })
    )
    
    expect(res.status).toBe(429)
  })
})
```
