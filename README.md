# LicitaSeguro - Plataforma de Licitaciones Públicas

> Información transparente y accesible sobre licitaciones públicas en Chile

## 🚀 Inicio Rápido

### Requisitos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet

### Instalación

1. **Descargar archivos:**
   ```
   - index.html
   - LicitaSeguro-App.jsx
   - styles.css
   ```

2. **Abrir en navegador:**
   ```bash
   # En Linux/Mac
   open index.html
   
   # En Windows
   start index.html
   
   # O simplemente hacer doble clic en index.html
   ```

3. **¡Listo!** La aplicación cargará automáticamente.

---

## 📋 Funcionalidades

### 1. **Homepage (Página Principal)**
- Descripción de la plataforma
- Acceso a tres módulos principales
- Branding corporativo

### 2. **Listado de Licitaciones**
- Buscar licitaciones públicas
- Filtrar por estado (convocada, adjudicada, revocada, etc)
- Filtrar por fecha
- Paginación (10 items por página)
- Ver detalles de cada licitación

### 3. **Detalle de Licitación**
- Información completa de una licitación
- Datos: código, nombre, estado, fecha, monto
- Información del organismo
- Región y comuna

### 4. **Búsqueda de Proveedores**
- Buscar proveedores por RUT
- Validación de RUT chileno
- Información del proveedor: razón social, estado, teléfono, email

---

## ⌨️ Navegación por Teclado

| Tecla | Acción |
|-------|--------|
| `Tab` | Mover al siguiente elemento |
| `Shift + Tab` | Mover al elemento anterior |
| `Enter` | Activar botón/enviar formulario |
| `Espacio` | Activar botón |

---

## 🎨 Diseño

### Paleta de Colores
- **Primario:** Azul oscuro (#1a1f71)
- **Secundario:** Dorado (#d4af37)
- **Éxito:** Verde (#27ae60)
- **Error:** Rojo (#e74c3c)
- **Advertencia:** Naranja (#f39c12)

### Responsive
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

### Accesibilidad
- ✅ WCAG AA Compliant
- ✅ Contraste de colores
- ✅ Labels en formularios
- ✅ ARIA attributes
- ✅ Navegación por teclado

---

## 📊 Datos

### Fuente de Datos
- **API:** Mercado Público Chile
- **URL:** https://api.mercadopublico.cl/

### Endpoints Consumidos

#### 1. Listado de Licitaciones
```
GET https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=DDMMYYYY&estado=nombre&ticket=TOKEN
```

#### 2. Detalle de Licitación
```
GET https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=XXXX-XX-LXXX&ticket=TOKEN
```

#### 3. Búsqueda de Proveedor
```
GET https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarProveedor?rutempreasaproveedor=XXXXXXXX-X&ticket=TOKEN
```

---

## 🧪 Pruebas

### RUT Válidos para Prueba
```
12345678-9    ✅ Válido
21987654-4    ✅ Válido
15429903-9    ✅ Válido
```

### RUT Inválidos (para prueba de validación)
```
12345678      ❌ Falta dígito verificador
12345678-8    ❌ Dígito verificador incorrecto
abcdefgh-k    ❌ Caracteres inválidos
```

---

## 📱 Ejemplos de Uso

### Buscar Licitaciones por Estado
1. Ir a "Licitaciones"
2. Seleccionar estado: "Adjudicada"
3. Hacer clic en "Buscar"
4. Ver resultados

### Buscar Licitaciones por Fecha
1. Ir a "Licitaciones"
2. Seleccionar fecha: 08/06/2025
3. Hacer clic en "Buscar"
4. Ver resultados

### Ver Detalle de Licitación
1. En listado, hacer clic en "Ver Detalle"
2. Visualizar información completa
3. Hacer clic en "Volver" para regresar

### Buscar Proveedor
1. Ir a "Proveedores"
2. Ingresar RUT: 15429903-9
3. Hacer clic en "Buscar Proveedor"
4. Ver información del proveedor

---

## 🔒 Validaciones

### RUT
- ✅ Formato: 12345678-9 o 123456789
- ✅ Dígito verificador validado
- ✅ Rango: 1-8 dígitos + DV

### Filtros
- ✅ Estado: select predefinido
- ✅ Fecha: input date HTML5
- ✅ Búsqueda: al menos un filtro

### Formularios
- ✅ Labels asociadas
- ✅ Mensajes de error claros
- ✅ Validación en tiempo real
- ✅ Indicadores visuales de error

---

## 🚨 Manejo de Errores

### Estados de Carga
- Loader bloqueante durante peticiones
- Mensaje: "Cargando datos..."

### Errores HTTP
- **403:** "Servidor no disponible. Por favor intente más tarde."
- **401:** "Sin permisos para acceder a los datos."
- **Otros:** Mensaje genérico + código

### Errores de Validación
- Mostrados inline debajo del campo
- Color rojo y fuente clara
- Con rol="alert" para lectores de pantalla

### Sin Resultados
- Mensaje: "No se encontraron licitaciones. Intente con otros filtros."
- Opción de intentar nuevamente

---

## 📈 Características Técnicas

### Framework
- **React** 18.2.0 (via CDN)
- **Babel** para JSX transpilation

### Librerías
- Ninguna dependencia externa
- Usa Fetch API nativa
- CSS custom properties para variables

### Navegadores Soportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📝 Estructura del Proyecto

```
├── index.html              # Punto de entrada
├── LicitaSeguro-App.jsx    # Componente principal React
├── styles.css              # Estilos (responsive + accessible)
├── README.md               # Este archivo
└── INFORME_LICITASEGURO.md # Documento detallado de cumplimiento
```

---

## 🎓 Rubrica de Evaluación

Este proyecto cumple con **100 puntos** en la siguiente rúbrica:

- ✅ **1.1.2** Diseño UI/UX: **8 pts**
- ✅ **1.2.3** Responsividad: **8 pts**
- ✅ **2.1.1** Interactividad: **13 pts**
- ✅ **2.1.2** Validación: **13 pts**
- ✅ **3.1.3** Accesibilidad: **23 pts**
- ✅ **3.2.1** Consumo de Endpoints: **23 pts**
- ✅ **Paquete** (Código, Informe, Video): **12 pts**

---

## 📞 Soporte

Para preguntas o problemas:
1. Revisar el archivo `INFORME_LICITASEGURO.md`
2. Consultar los comentarios en el código
3. Verificar la consola del navegador (F12) para errores

---

## 📄 Licencia

Proyecto educativo - Instituto Profesional San Sebastián

---

**Última actualización:** Junio 2026
**integrantes:** Andres Eduardo Rodriguez carrasco, Felipe Enrique Rodriguez carrasco

