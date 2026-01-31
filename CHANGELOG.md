# Changelog - Proyecty

Registro de cambios del proyecto de gestión de préstamos hipotecarios.

---

## [2026-01-29] - Configuración de instrucciones Copilot

**Tipo:** Setup

**Descripción:** 
Creación del archivo de instrucciones para GitHub Copilot con reglas del proyecto, convenciones de código, y lineamientos de comportamiento.

**Archivos creados:**
- `.github/copilot-instructions.md`
- `CHANGELOG.md`

---

## [2026-01-29] - Calculadora de intereses en transacciones

**Tipo:** Feature

**Descripción:** 
Agregada calculadora automática de intereses en el modal de nueva transacción. Muestra el saldo pendiente, tasa mensual y calcula el interés sugerido para pagos.

**Archivos modificados:**
- `src/components/modals/NewTransactionModal.tsx`

---

## [2026-01-29] - Traducción de tipos de transacción a español

**Tipo:** Style

**Descripción:** 
Los tipos de transacción ahora se muestran en español en la página de detalle de hipoteca.

**Archivos modificados:**
- `src/pages/MortgageDetailPage.tsx`

---

## [2026-01-29] - Tracking de balance de préstamos

**Tipo:** Feature

**Descripción:** 
Implementado seguimiento del saldo actual del préstamo. Se actualiza automáticamente con desembolsos y pagos de capital.

**Archivos modificados:**
- `src/components/modals/NewTransactionModal.tsx`
- `src/components/modals/NewLoanModal.tsx`

---

## [2026-01-29] - Edición y eliminación de inversiones

**Tipo:** Feature

**Descripción:** 
Agregada funcionalidad para editar el monto de inversiones y eliminar inversiones existentes desde la página de detalle de hipoteca.

**Archivos modificados:**
- `src/pages/MortgageDetailPage.tsx`

---

## [2026-01-29] - Edición y eliminación de préstamos

**Tipo:** Feature

**Descripción:** 
Agregado modal de edición para préstamos y funcionalidad de eliminación suave (soft delete) en la página de préstamos.

**Archivos modificados:**
- `src/pages/LoansPage.tsx`

---

## [2026-01-29] - Generación de código de transacción en frontend

**Tipo:** Fix

**Descripción:** 
Corregido error de código de transacción nulo. Ahora se genera en el frontend con formato `TX-YYYYMMDD-XXXX`.

**Archivos modificados:**
- `src/components/modals/NewTransactionModal.tsx`

---

## [Anteriores] - Funcionalidades base

**Tipo:** Feature

**Descripción:** 
- Sistema de autenticación con Supabase
- CRUD de hipotecas y préstamos
- Gestión de inversionistas
- Invitaciones por email (Gmail SMTP)
- Dashboard con métricas básicas
- Página de registro con campos adicionales (documento, ciudad, departamento)
