# SRI - Identidad Visual Actualizada

## 🎨 Sistema de Diseño Aplicado

Basado en las imágenes de referencia proporcionadas, se ha actualizado completamente el sistema de diseño del proyecto SRI para reflejar la identidad oficial de marca.

### Paleta de Colores

**Colores Principales:**

- **Fondo Corporativo**: `hsl(210, 10%, 23%)` - Gris oscuro profesional
- **Verde SRI Primario**: `hsl(100, 45%, 48%)` - #6DA544 aproximado
- **Amarillo Alerta**: `hsl(48, 100%, 50%)` - Para IA y advertencias  
- **Rojo Error**: `hsl(4, 90%, 58%)` - Para errores críticos
- **Gris Secundario**: `hsl(0, 0%, 85%)` - Elementos neutros

### Tipografía

- **Fuente Principal**: Nunito
- **Pesos**: 400 (Regular), 600 (SemiBold), 700 (Bold), 800 (ExtraBold)
- **Uso**: Moderna y profesional, perfecta para interfaces de software

### Logo

![Logo SRI](C:/Users/Agustin/.gemini/antigravity/brain/03a06366-cea1-460b-8047-45a0c7826f67/sri_logo_1768949845291.png)

**Características:**

- Forma de escudo
- Surcos de campo en la parte inferior
- Letras "SRI" bold en blanco
- Dos tonos de verde representando el campo

### Componentes

#### Botones

**Variantes disponibles:**

```html
<button class="btn btn-primary">Primario Verde SRI</button>
<button class="btn btn-confirmar">CONFIRMAR</button>
<button class="btn btn-alerta">⚠️ ALERTA</button>
<button class="btn btn-error">❌ ERROR</button>
<button class="btn btn-secondary">Secundario</button>
```

**Estados visuales:**

- Hover: Elevación y cambio de tono
- Active: Sin elevación
- Disabled: Opacidad 50%

#### Badges

```html
<span class="badge badge-ia">IA AVANZADO 98%</span>
<span class="badge badge-alerta">⚠️ ALERTA</span>
<span class="badge badge-error">❌ ERROR</span>
```

### Iconografía

Según la referencia:

- 📄 Documentos
- 🔍 Auditoría / Lupa
- 🏢 Silos / Infraestructura
- ✓ Checkmarks para confianza y profesionalismo

### Tono de Voz

**Valores comunicados:**

- ✓ Confianza
- ✓ Precisión
- ✓ Protección
- ✓ Profesionalismo
- ✓ Tecnología

---

## 📁 Archivos Modificados

### CSS

- `public/assets/css/base.css` - Reescrito completamente con nuevo sistema de diseño

### Logos

- `public/assets/images/sri-logo.png` - Logo oficial con escudo y surcos

### HTML

- `public/index.html` - Actualizado con fuente Nunito

---

## 🚀 Uso del Sistema de Diseño

### Colores

```css
/* Usar variables CSS */
background: var(--color-primary);
color: var(--color-fondo);
border-color: var(--color-alerta);
```

### Botones

```html
<!-- Botón principal de acción -->
<button class="btn btn-primary">Acción Principal</button>

<!-- Confirmación exitosa -->
<button class="btn btn-confirmar">Confirmar Operación</button>

<!-- Advertencia/Precaución -->  
<button class="btn btn-alerta">Revisar Datos</button>

<!-- Acción destructiva -->
<button class="btn btn-error">Eliminar</button>
```

### Badges de Estado

```html
<!-- Proceso con IA -->
<span class="badge badge-ia">IA AVANZADO 95%</span>

<!-- Advertencia -->
<span class="badge badge-alerta">REVISAR</span>

<!-- Error detectado -->
<span class="badge badge-error">DISCREPANCIA</span>
```

---

## 🎯 Aplicación en Interfaces

### Ejemplo: Carga de Documentos

```html
<div class="card">
  <div class="card-header">
    <h3>Cargar CPE/CTG</h3>
  </div>
  <div class="card-body">
    <!-- Zona de drag & drop -->
    <p class="text-muted">
      ✓ Foto lista para enviar<br>
      ✓ Procesando OCR...<br>
      ✓ Discrepancia detectada<br>
      ✓ Revisá humedad y factor
    </p>
  </div>
  <div class="card-footer">
    <button class="btn btn-confirmar">Procesar Documento</button>
    <span class="badge badge-ia">IA AVANZADO 98%</span>
  </div>
</div>
```

---

## 📊 Comparación Antes/Después

### Antes

- Colores: Verde oscuro + Naranja tierra
- Tipografía: Inter + Outfit
- Botones: Gradientes
- Estilo: Genérico corporativo

### Después ✨

- Colores: Verde SRI + Amarillo + Rojo + Fondo oscuro
- Tipografía: Nunito (profesional y moderna)
- Botones: Sólidos con estados claros
- Estilo: Identidad agro-industrial específica

---

## 🔧 Mantenimiento

Para mantener la consistencia visual:

1. **Siempre usar variables CSS** - No hardcodear colores
2. **Usar clases de utilidad** - `.text-primary`, `.bg-alerta`, etc.
3. **Respetar jerarquía de botones** - Primary > Confirmar > Secondary
4. **Badges solo para estados** - No abusar, solo información importante
5. **Mantener tono profesional** - Checkmarks, precisión, confianza

---

**Última actualización**: 20 de Enero 2026  
**Versión del diseño**: 2.0 (Identidad Oficial)
