## 🧪 Tests

```typescript
describe('Setup Timeout', () => {
  it("debería bloquear acceso después de 24h sin setup", async () => {
    // Crear org hace 25h
    const org = await createOrganization({
      paidAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      setupDeadline: new Date(Date.now() - 1 * 60 * 60 * 1000),
      setupCompletedAt: null
    })
    
    // Intentar acceder
    const res = await app.request(
      new Request('/inbox', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
    )
    
    expect(res.status).toBe(403)
    expect(res.body).toContain('Setup requerido')
  })
  
  it("debería permitir acceso si completó setup en 24h", async () => {
    const org = await createOrganization({
      paidAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      setupDeadline: new Date(Date.now() + 14 * 60 * 60 * 1000),
      setupCompletedAt: new Date()  // ✅ Completó
    })
    
    const res = await app.request(
      new Request('/inbox', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
    )
    
    expect(res.status).toBe(200)
  })
  
  it("debería permitir acceso si aún está en plazo", async () => {
    const org = await createOrganization({
      paidAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      setupDeadline: new Date(Date.now() + 14 * 60 * 60 * 1000),
      setupCompletedAt: null
    })
    
    const res = await app.request(
      new Request('/setup', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
    )
    
    expect(res.status).toBe(200)  // Puede acceder a /setup
  })
  
  it("debería enviar email de recordatorio cada 6h", async () => {
    // Mock Mercado Pago subscription created 18h ago
    const org = await createOrganization({
      paidAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      setupDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000)
    })
    
    await sendSetupReminders()
    
    // Verificar que email fue enviado
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '⏰ 6h para completar setup en Apex IA'
      })
    )
  })
})
```

---

## 🎯 Ventajas de Este Approach

✅ **Sin cancelar pago:** Cliente mantiene su suscripción  
✅ **Incentiva urgencia:** No puede usar hasta completar  
✅ **Flexible:** Puede completar en cualquier momento  
✅ **Email claro:** Recordatorios, no spam  
✅ **Buena UX:** No sorpresas, bloqueo limpio  
✅ **Facilita soporte:** Cliente no necesita "repagar"

---
