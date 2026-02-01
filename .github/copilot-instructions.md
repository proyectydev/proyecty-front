# Copilot Instructions - Proyecty

## 📋 Descripción del Proyecto

**Proyecty** es un sistema de gestión de préstamos hipotecarios con modelo de crowdlending. Permite:

- **Gestión de Hipotecas**: Crear, editar y dar seguimiento a préstamos hipotecarios
- **Inversionistas**: Múltiples inversionistas pueden participar en cada préstamo
- **Transacciones**: Registro de desembolsos, pagos de intereses, abonos a capital, comisiones
- **Distribución de Rendimientos**: División automática entre Proyecty (plataforma) e inversionistas
- **Dashboard Analítico**: Métricas financieras con filtros por fecha

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Email**: Gmail SMTP con App Password

### Estructura de Base de Datos Principal
- `mortgages` - Préstamos hipotecarios
- `investors` - Inversionistas registrados
- `mortgage_investors` - Relación inversiones por préstamo
- `transactions` - Movimientos financieros
- `profiles` - Perfiles de usuario

---

## 🎨 Diseño Responsive - OBLIGATORIO

**TODAS las interfaces deben ser responsive y verse correctamente en:**

### Desktop (>1024px)
- Layouts de múltiples columnas
- Tablas completas con todas las columnas
- Sidebars visibles

### Tablet (768px - 1024px)
- Grids de 2 columnas máximo
- Tablas con scroll horizontal si es necesario
- Menús colapsables

### Mobile (<768px)
- Layout de 1 columna
- Cards en lugar de tablas cuando sea posible
- Navegación tipo hamburger
- Botones de tamaño táctil (mínimo 44px)
- Modales que ocupen pantalla completa o casi completa

### Clases Tailwind a usar:
```
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Flex: flex-col md:flex-row
- Spacing: p-4 md:p-6 lg:p-8
- Text: text-sm md:text-base
- Hidden/Show: hidden md:block / block md:hidden
```

---

## 📝 Registro de Cambios - OBLIGATORIO

**Mantener actualizado el archivo `CHANGELOG.md` en la raíz del proyecto.**

Cada cambio debe incluir:
- Fecha
- Descripción breve
- Archivos modificados
- Tipo: [Feature] [Fix] [Refactor] [Style]

Formato:
```markdown
## [Fecha] - Título del cambio

**Tipo:** Feature/Fix/Refactor/Style

**Descripción:** 
Breve explicación de qué se hizo y por qué.

**Archivos modificados:**
- `ruta/archivo1.tsx`
- `ruta/archivo2.ts`
```

---

## ⚠️ Reglas de Comportamiento - IMPORTANTE

### 1. SIEMPRE preguntar antes de:
- Eliminar archivos o código existente
- Cambiar la estructura de la base de datos
- Modificar configuraciones críticas (auth, env, etc.)
- Refactorizar código que funciona
- Cambiar dependencias o versiones

### 2. SIEMPRE explicar:
- Qué cambios se van a hacer
- Por qué se hacen de esa manera
- Qué archivos se van a modificar
- Posibles efectos secundarios

### 3. SIEMPRE validar:
- Que el código compila (`npm run build`)
- Que no hay errores de TypeScript
- Que los cambios son coherentes con el código existente

### 4. NUNCA hacer sin avisar:
- Borrar archivos
- Cambiar nombres de funciones/componentes usados en otros lugares
- Modificar la lógica de negocio existente
- Agregar nuevas dependencias

---

## 🔧 Convenciones de Código

### Nombrado
- Componentes: PascalCase (`MortgageCard.tsx`)
- Funciones: camelCase (`calculateInterest`)
- Constantes: UPPER_SNAKE_CASE (`MAX_INVESTORS`)
- Archivos de tipos: `types.ts` o `*.types.ts`

### Estructura de Componentes
```tsx
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Component
// 5. Export
```

### Idioma
- **UI/Labels**: Español (es usuario final colombiano)
- **Código/Variables**: Inglés
- **Comentarios**: Español o Inglés (consistente por archivo)

### Moneda
- Formato colombiano: `$1.234.567`
- Usar `toLocaleString('es-CO')` para formateo

---

## 🗂️ Estructura del Proyecto

```
proyecty-front/
├── src/
│   ├── components/
│   │   ├── modals/          # Modales reutilizables
│   │   ├── ui/              # Componentes Shadcn
│   │   └── ...
│   ├── pages/               # Páginas principales
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilidades y config
│   ├── types/               # Tipos TypeScript
│   └── integrations/        # Supabase client
├── supabase/
│   └── functions/           # Edge Functions
└── ...
```

---

## 📊 Lógica de Negocio Clave

### Tasas de Interés
- `total_interest_rate`: Tasa total anual del préstamo
- `proyecty_rate`: Porcentaje que se queda Proyecty
- `investor_rate`: Porcentaje para inversionistas
- Relación: `total = proyecty + investor`

### Balance del Préstamo
- `requested_amount`: Monto solicitado original
- `current_balance`: Saldo pendiente actual
- Al desembolsar: `current_balance = requested_amount`
- Al pagar capital: `current_balance -= pago`

### Estados de Préstamo
- `pending`: Pendiente de aprobación
- `approved`: Aprobado, pendiente desembolso
- `disbursed`: Desembolsado, en curso
- `paid_off`: Pagado completamente
- `defaulted`: En mora grave
- `deleted`: Eliminado (soft delete)

---

## ✅ Checklist antes de cada cambio

- [ ] ¿Entendí correctamente lo que el usuario quiere?
- [ ] ¿Expliqué qué voy a hacer?
- [ ] ¿El cambio es responsive?
- [ ] ¿Actualicé el CHANGELOG.md?
- [ ] ¿El código compila sin errores?
- [ ] ¿Mantuve consistencia con el código existente?
