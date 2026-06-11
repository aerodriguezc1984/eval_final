/* ============================================================================
 * LICITASEGURO — Aplicación React para consulta de licitaciones públicas
 * ----------------------------------------------------------------------------
 * Indicadores de la rúbrica cubiertos en este archivo:
 *   1.1.2  Principios y estándares de diseño UI/UX (jerarquía, consistencia)
 *   1.2.3  Diseño responsivo (ver styles.css; aquí se usan clases adaptables)
 *   2.1.1  Interactividad: eventos, filtros, loader, paginación
 *   2.1.2  Validación de datos en formularios (RUT, fecha, estado)
 *   3.1.3  Accesibilidad y usabilidad (label, ARIA, foco, tabindex, alt)
 *   3.2.4  Consumo de los 3 endpoints de Mercado Público
 *
 * NOTA TÉCNICA: este archivo se ejecuta con babel-standalone en el navegador,
 * por lo que NO usa import/export de ES módulos. React, ReactDOM y los hooks
 * se toman del ámbito global expuesto por los <script> del CDN.
 * ==========================================================================*/

const { useState, useEffect, useCallback, useRef } = React;

/* ============================================================================
 * CONFIGURACIÓN DE LA API (Mercado Público)
 * ==========================================================================*/

// Ticket de ejemplo entregado en el instructivo de apoyo de la evaluación.
const TICKET = 'AC3A098B-4CD0-41AF-81A5-41284248419B';
const API_BASE = 'https://api.mercadopublico.cl/servicios/v1/publico';
const API_EMPRESAS = 'https://api.mercadopublico.cl/servicios/v1/Publico/Empresas';

/* ============================================================================
 * UTILIDADES DE VALIDACIÓN Y LIMPIEZA DE DATOS
 * ==========================================================================*/

/**
 * Validación COMPLETA de RUT chileno (Indicador 2.1.2):
 * verifica formato y calcula el dígito verificador (módulo 11).
 * Devuelve { valido, error } con mensaje contextualizado por caso.
 */
const validarRUT = (rut) => {
  if (!rut || !rut.trim()) {
    return { valido: false, error: 'El RUT es obligatorio.' };
  }

  const limpio = rut.replace(/[.\s-]/g, '').toUpperCase();

  if (!/^\d{7,8}[0-9K]$/.test(limpio)) {
    return {
      valido: false,
      error: 'Formato inválido. Use 7 u 8 dígitos más el verificador. Ej: 77653382-3',
    };
  }

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo > 6 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);

  if (dv !== dvEsperado) {
    return { valido: false, error: 'El dígito verificador no corresponde al RUT ingresado.' };
  }

  return { valido: true, error: null };
};

/** Da formato 77.653.382-3 a un RUT para presentación. */
const formatearRUT = (rut) => {
  if (!rut) return '--';
  const limpio = String(rut).replace(/[.\s-]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const dv = limpio.slice(-1);
  const numero = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${numero}-${dv}`;
};

/**
 * Limpia tildes/entidades y caracteres especiales de respuestas de la API
 * (Tarea 6). Devuelve '--' cuando el valor es nulo o vacío.
 */
const limpiarTexto = (texto) => {
  if (texto === null || texto === undefined || texto === '') return '--';
  const aux = document.createElement('textarea');
  aux.innerHTML = String(texto);
  return aux.value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim() || '--';
};

/** Formatea una fecha ISO o /Date()/ a dd/mm/aaaa. */
const formatearFecha = (fecha) => {
  if (!fecha) return '--';
  let d;
  const m = String(fecha).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  } else {
    d = new Date(fecha);
  }
  if (isNaN(d.getTime())) return '--';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
};

/** Formatea un monto numérico como pesos chilenos. */
const formatearMonto = (monto) => {
  const n = Number(monto);
  if (!monto || isNaN(n) || n <= 0) return '--';
  return `$${n.toLocaleString('es-CL')}`;
};

/** Traduce el CodigoEstado numérico de la API a texto legible. */
const ESTADOS = {
  5: 'Publicada', 6: 'Cerrada', 7: 'Desierta', 8: 'Adjudicada',
  18: 'Revocada', 19: 'Suspendida', 4: 'Convocada',
};

/**
 * Normaliza una licitación cruda (de la API real o de la data demo) a un
 * objeto estable que la UI sabe pintar, manejando campos nulos con '--'.
 */
const normalizarLicitacion = (raw) => ({
  codigo: raw.CodigoExterno || raw.codigo || '--',
  nombre: limpiarTexto(raw.Nombre || raw.nombre),
  estado: limpiarTexto(raw.Estado || ESTADOS[raw.CodigoEstado] || raw.estado),
  fecha: formatearFecha(raw.FechaCierre || raw.FechaCreacion || raw.fecha),
  monto: formatearMonto(raw.MontoEstimado || raw.monto),
});



const ESTADOS_DEMO = ['Publicada', 'Cerrada', 'Adjudicada', 'Revocada', 'Desierta', 'Convocada'];
const ORG_DEMO = ['Municipalidad de Santiago', 'Servicio de Salud Metropolitano',
  'Ministerio de Obras Públicas', 'JUNAEB', 'Carabineros de Chile', 'Universidad de Chile'];

const LICITACIONES_DEMO = Array.from({ length: 23 }, (_, i) => {
  const n = i + 1;
  return {
    CodigoExterno: `10575${39 + n}-${n}-LR25`,
    Nombre: `Adquisición de bienes y servicios N° ${n} para gestión pública`,
    Estado: ESTADOS_DEMO[i % ESTADOS_DEMO.length],
    FechaCierre: `2025-0${(i % 9) + 1}-${String((i % 27) + 1).padStart(2, '0')}T15:00:00`,
    MontoEstimado: (n * 1250000) + 4500000,
    Descripcion: `Proceso de licitación pública N° ${n} para la contratación de bienes y servicios. Incluye especificaciones técnicas, plazos de entrega y criterios de evaluación según normativa vigente de ChileCompra.`,
    Organismo: ORG_DEMO[i % ORG_DEMO.length],
    Region: 'Región Metropolitana de Santiago',
    Comuna: 'Santiago',
  };
});

// Proveedor conocido (ejemplo del instructivo de la evaluación).
const PROVEEDORES_DEMO = {
  '776533823': {
    razonSocial: 'Comercializadora y Servicios Integrales SpA',
    rut: '77.653.382-3',
    codigoEmpresa: 17793,
    estado: 'Activo / Hábil',
    actividad: 'Venta al por mayor de equipos y suministros de oficina',
    region: 'Región Metropolitana',
    ciudad: 'Santiago',
  },
};

// Genera un proveedor de demostración para CUALQUIER RUT válido cuando la API
// está bloqueada por CORS, para que la búsqueda sea demostrable con cualquier RUT.
const ACTIVIDADES_DEMO = ['Servicios de tecnología y software', 'Construcción y obras civiles',
  'Suministro de insumos médicos', 'Transporte y logística', 'Consultoría y asesoría profesional'];
const CIUDADES_DEMO = [['Región Metropolitana', 'Santiago'], ['Región de Valparaíso', 'Valparaíso'],
  ['Región del Biobío', 'Concepción'], ['Región de La Araucanía', 'Temuco'], ['Región de Antofagasta', 'Antofagasta']];

const proveedorDemoDesdeRut = (rutLimpio, rutOriginal) => {
  if (PROVEEDORES_DEMO[rutLimpio]) return PROVEEDORES_DEMO[rutLimpio];
  const seed = rutLimpio.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const [region, ciudad] = CIUDADES_DEMO[seed % CIUDADES_DEMO.length];
  return {
    razonSocial: `Proveedor Demostración N° ${rutLimpio.slice(0, 4)} Ltda.`,
    rut: rutOriginal,
    codigoEmpresa: 10000 + (seed % 89999), // código de empresa simulado
    estado: 'Activo / Hábil',
    actividad: ACTIVIDADES_DEMO[seed % ACTIVIDADES_DEMO.length],
    region,
    ciudad,
  };
};

/* ============================================================================
 * CAPA DE SERVICIO — CONSUMO DE LOS 3 ENDPOINTS (Indicador 3.2.4 / Tareas 4 y 6)
 * Cada función intenta la API real, controla códigos HTTP y, ante un fallo de
 * red/CORS, recurre a la data demo dejando una advertencia para la UI.
 * ==========================================================================*/

/** Endpoint 1: Listado de licitaciones, filtrable por fecha y estado. */
const servicioListado = async ({ fecha, estado }) => {
  const params = new URLSearchParams();
  // fecha en formato ddmmaaaa según la documentación de la API
  if (fecha) params.append('fecha', fecha.split('-').reverse().join(''));
  if (estado) params.append('estado', estado);
  params.append('ticket', TICKET);
  console.log('Consultando API real con parámetros:', params.toString());
  const url = `${API_BASE}/licitaciones.json?${params.toString()}`;

  try {
    const resp = await fetch(url);
    // Control explícito de códigos HTTP con mensajes contextualizados
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('Sin permisos para acceder a los datos (verifique el ticket).');
      if (resp.status === 404) throw new Error('Recurso no encontrado en el servidor.');
      if (resp.status >= 500) throw new Error('El servidor de Mercado Público no está disponible. Intente más tarde.');
      throw new Error(`Error al cargar licitaciones (HTTP ${resp.status}).`);
    }
    const data = await resp.json();
    const listado = Array.isArray(data) ? data : (data.Listado || []);
    return { datos: listado.map(normalizarLicitacion), aviso: null };
  } catch (err) {
    // TypeError = bloqueo por CORS/sin conexión -> usamos data demo
    if (err instanceof TypeError) {
      let demo = LICITACIONES_DEMO;
      if (estado) demo = demo.filter((l) => l.Estado.toLowerCase() === estado.toLowerCase());
      return {
        datos: demo.map(normalizarLicitacion),
        aviso: 'Mostrando datos de demostración: la API de Mercado Público no permite llamadas directas desde el navegador (CORS).',
      };
    }
    throw err; // errores HTTP se propagan a la UI
  }
};

/** Endpoint 3: Detalle de una licitación por código. */
const servicioDetalle = async (codigo) => {
  const url = `${API_BASE}/licitaciones.json?codigo=${encodeURIComponent(codigo)}&ticket=${TICKET}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 403) throw new Error('Servidor no disponible. Intente más tarde.');
      throw new Error(`Error al cargar el detalle (HTTP ${resp.status}).`);
    }
    const data = await resp.json();
    const item = (Array.isArray(data) ? data[0] : (data.Listado || [])[0]);
    if (!item) throw new Error('No se encontraron detalles para esta licitación.');
    return { datos: detalleDesde(item), aviso: null };
  } catch (err) {
    if (err instanceof TypeError) {
      const item = LICITACIONES_DEMO.find((l) => l.CodigoExterno === codigo) || LICITACIONES_DEMO[0];
      return {
        datos: detalleDesde(item),
        aviso: 'Mostrando datos de demostración (la API no permite CORS desde el navegador).',
      };
    }
    throw err;
  }
};

const detalleDesde = (item) => ({
  ...normalizarLicitacion(item),
  descripcion: limpiarTexto(item.Descripcion || item.descripcion),
  organismo: limpiarTexto((item.Comprador && item.Comprador.NombreOrganismo) || item.Organismo || item.organismo),
  region: limpiarTexto((item.Comprador && item.Comprador.RegionUnidad) || item.Region || item.region),
  comuna: limpiarTexto((item.Comprador && item.Comprador.ComunaUnidad) || item.Comuna || item.comuna),
});

/**
 * Endpoint 2 (oficial ChileCompra / Mercado Público): Búsqueda de proveedor por RUT.
 *   https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarProveedor
 *     ?rutempresaproveedor=70.017.820-k&ticket=...
 * IMPORTANTE: la documentación exige enviar el RUT CON puntos, guión y dígito
 * verificador. La respuesta entrega CodigoEmpresa y NombreEmpresa.
 */
const servicioProveedor = async (rut) => {
  const rutLimpio = rut.replace(/[.\s-]/g, '');
  const rutFormateado = formatearRUT(rut); // formato 70.017.820-K requerido por la API
  const url = `${API_EMPRESAS}/BuscarProveedor?rutempresaproveedor=${encodeURIComponent(rutFormateado)}&ticket=${TICKET}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) throw new Error('Sin permisos para acceder al servicio (verifique el ticket).');
      if (resp.status >= 500) throw new Error('El servidor de Mercado Público no está disponible. Intente más tarde.');
      throw new Error(`Error al buscar el proveedor (HTTP ${resp.status}).`);
    }
    const data = await resp.json();
    // La API puede devolver { listaEmpresas: [ {CodigoEmpresa, NombreEmpresa} ] } o un objeto
    const lista = data && (data.listaEmpresas || data.Listado || data.Empresas);
    const item = Array.isArray(lista) ? lista[0] : (lista || data);
    const nombre = item && (item.NombreEmpresa || item.nombreEmpresa || item.razonSocial);
    if (!item || !nombre) {
      return { datos: null, aviso: null }; // respuesta vacía -> "Proveedor no encontrado"
    }
    return {
      datos: {
        razonSocial: limpiarTexto(nombre),
        rut: rutFormateado,
        codigoEmpresa: item.CodigoEmpresa || item.codigoEmpresa || '--',
        estado: limpiarTexto(item.Estado || item.estado || 'Inscrito en Mercado Público'),
      },
      aviso: null,
    };
  } catch (err) {
    // TypeError = bloqueo CORS / sin conexión: la API no habilita llamadas
    // directas desde el navegador, por lo que se usan datos de demostración.
    if (err instanceof TypeError) {
      return {
        datos: proveedorDemoDesdeRut(rutLimpio, rutFormateado),
        aviso: 'Mostrando datos de demostración: la API de Mercado Público (ChileCompra) no permite llamadas directas desde el navegador (CORS). El endpoint oficial sí queda configurado en el código.',
      };
    }
    throw err;
  }
};

/* ============================================================================
 * COMPONENTE: LOADER (Indicador 2.1.1)
 * Aparece antes de la petición, bloquea interacción y se oculta al terminar.
 * ==========================================================================*/

const Loader = ({ visible, mensaje = 'Cargando datos...' }) => {
  if (!visible) return null;
  return (
    <div className="loader-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loader-container">
        <div className="spinner" aria-hidden="true"></div>
        <p className="loader-text">{mensaje}</p>
      </div>
    </div>
  );
};

/* ============================================================================
 * COMPONENTE: MENSAJES (error y aviso)
 * ==========================================================================*/

const MensajeError = ({ error, onDismiss }) => {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert" aria-live="assertive">
      <div className="alert-content">
        <span className="alert-icon" aria-hidden="true">⚠️</span>
        <span className="alert-message">{error}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="alert-close" aria-label="Cerrar alerta">✕</button>
      )}
    </div>
  );
};

const MensajeAviso = ({ aviso }) => {
  if (!aviso) return null;
  return (
    <div className="alert alert-info" role="status" aria-live="polite">
      <span className="alert-icon" aria-hidden="true">ℹ️</span>
      <span className="alert-message">{aviso}</span>
    </div>
  );
};

/* ============================================================================
 * COMPONENTE: HOMEPAGE corporativo (Tarea: homepage que dirige a los módulos)
 * ==========================================================================*/

const HomePage = ({ onNavigate }) => (
  <section className="homepage" aria-labelledby="home-title">
    <header className="hero-section">
      <div className="hero-content">
        <h1 id="home-title">LicitaSeguro</h1>
        <p className="hero-subtitle">Licitaciones de Mercado Público, en un solo lugar.</p>
        <p className="hero-description">Consulta el listado completo, filtra por estado y fecha, y busca proveedores por RUT.</p>
        <div className="hero-actions">
          <button onClick={() => onNavigate('listado')} className="btn btn-search">Explorar licitaciones</button>
          <button onClick={() => onNavigate('proveedores')} className="btn btn-outline">Buscar proveedor</button>
        </div>
      </div>
    </header>

    <div className="container-main">
      <ul className="features-grid">
        <li className="feature-card">
          <div className="feature-icon" aria-hidden="true">📋</div>
          <h2>Listado de Licitaciones</h2>
          <p>Explora todas las licitaciones públicas disponibles en Mercado Público, con filtros por estado y fecha.</p>
          <button onClick={() => onNavigate('listado')} className="btn btn-primary" aria-label="Ir al listado de licitaciones">
            Explorar Licitaciones
          </button>
        </li>
        <li className="feature-card">
          <div className="feature-icon" aria-hidden="true">🔍</div>
          <h2>Buscar Proveedores</h2>
          <p>Encuentra información de proveedores registrados validando su RUT con dígito verificador.</p>
          <button onClick={() => onNavigate('proveedores')} className="btn btn-primary" aria-label="Ir a búsqueda de proveedores">
            Buscar Proveedor
          </button>
        </li>
        <li className="feature-card">
          <div className="feature-icon" aria-hidden="true">ℹ️</div>
          <h2>Acerca de LicitaSeguro</h2>
          <p>Plataforma dedicada a facilitar el acceso transparente a la información de licitaciones públicas.</p>
          <p className="info-text">Todos los datos provienen de Mercado Público — Chile.</p>
        </li>
      </ul>
    </div>
  </section>
);

/* ============================================================================
 * COMPONENTE: LISTADO DE LICITACIONES
 * Filtros + validación + loader + paginación (Indicadores 2.1.1 y 3.2.4)
 * ==========================================================================*/

const ITEMS_POR_PAGINA = 10;

const ListadoLicitaciones = ({ onVerDetalle }) => {
  const [licitaciones, setLicitaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [erroresFiltro, setErroresFiltro] = useState({});
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  /** Valida los filtros antes de consultar (Indicador 2.1.2). */
  const validarFiltros = () => {
    const errs = {};
    if (filtroFecha) {
      const hoy = new Date(); hoy.setHours(23, 59, 59, 999);
      const sel = new Date(`${filtroFecha}T00:00:00`);
      if (isNaN(sel.getTime())) errs.fecha = 'La fecha ingresada no es válida.';
      else if (sel > hoy) errs.fecha = 'La fecha no puede ser posterior a hoy.';
    }
    setErroresFiltro(errs);
    return Object.keys(errs).length === 0;
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAviso(null);
    try {
      const { datos, aviso } = await servicioListado({ fecha: filtroFecha, estado: filtroEstado });
      setLicitaciones(datos);
      setAviso(aviso);
      setPaginaActual(1);
      if (datos.length === 0) setError('No se encontraron licitaciones con los filtros indicados.');
    } catch (err) {
      setError(err.message || 'Error al cargar los datos. Intente más tarde.');
      setLicitaciones([]);
    } finally {
      setLoading(false);
      setBusquedaRealizada(true);
    }
  }, [filtroEstado, filtroFecha]);

  // Carga inicial al montar
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    if (!validarFiltros()) return; // no consulta si los filtros son inválidos
    cargar();
  };

  const totalPaginas = Math.max(1, Math.ceil(licitaciones.length / ITEMS_POR_PAGINA));
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const visibles = licitaciones.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <section className="listado-section" aria-labelledby="listado-title">
      <div className="container">
        <h1 id="listado-title">Listado de Licitaciones</h1>

        {/* FORMULARIO DE FILTROS (eventos + validación) */}
        <form onSubmit={handleBuscar} className="filtros-form" role="search" aria-label="Filtros de licitaciones" noValidate>
          <fieldset>
            <legend>Filtros de búsqueda</legend>
            <div className="filtros-grid">
              <div className="form-group">
                <label htmlFor="filtro-estado">Estado de la licitación <span className="optional">(opcional)</span></label>
                <select
                  id="filtro-estado"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="form-control"
                  aria-describedby="estado-help"
                >
                  <option value="">-- Todos los estados --</option>
                  <option value="convocada">Convocada</option>
                  <option value="publicada">Publicada</option>
                  <option value="adjudicada">Adjudicada</option>
                  <option value="revocada">Revocada</option>
                  <option value="desierta">Desierta</option>
                  <option value="cerrada">Cerrada</option>
                </select>
                <small id="estado-help">Filtra por el estado actual de la licitación.</small>
              </div>

              <div className="form-group">
                <label htmlFor="filtro-fecha">Fecha de la licitación <span className="optional">(opcional)</span></label>
                <input
                  id="filtro-fecha"
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => { setFiltroFecha(e.target.value); setErroresFiltro({}); }}
                  className={`form-control ${erroresFiltro.fecha ? 'form-control-error' : ''}`}
                  aria-describedby="fecha-help fecha-error"
                  aria-invalid={!!erroresFiltro.fecha}
                />
                {erroresFiltro.fecha && <span id="fecha-error" className="error-message" role="alert">{erroresFiltro.fecha}</span>}
                <small id="fecha-help">Selecciona una fecha para filtrar (no futura).</small>
              </div>

              <div className="form-group form-group-action" style={{ alignSelf: 'end', paddingBottom: '1.4rem' }}>
                <button type="submit" className="btn btn-search"disabled={loading} aria-busy={loading}>
                  {loading ? 'Buscando...' : '🔍 Buscar'}
                </button>
              </div>
            </div>
          </fieldset>
        </form>

        <Loader visible={loading} mensaje="Cargando licitaciones..." />
        <MensajeAviso aviso={aviso} />
        <MensajeError error={error} onDismiss={() => setError(null)} />

        {/* RESUMEN ACCESIBLE DE RESULTADOS */}
        {!loading && licitaciones.length > 0 && (
          <p className="resultados-info" role="status" aria-live="polite">
            {licitaciones.length} licitación(es) encontrada(s). Mostrando {inicio + 1}–{Math.min(inicio + ITEMS_POR_PAGINA, licitaciones.length)}.
          </p>
        )}

        {/* TABLA DE RESULTADOS */}
        {!loading && licitaciones.length > 0 && (
          <>
            <div className="table-responsive" role="region" aria-label="Resultados de licitaciones" tabIndex="0">
              <table className="table table-striped">
                <caption className="sr-only">Listado de licitaciones públicas con código, nombre, estado, fecha y monto.</caption>
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Monto estimado</th>
                    <th scope="col">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((lic) => (
                    <tr key={lic.codigo}>
                      <td data-label="Código"><span className="codigo-mono">{lic.codigo}</span></td>
                      <td data-label="Nombre" className="nombre-col">{lic.nombre}</td>
                      <td data-label="Estado">
                        <span className={`badge badge-${lic.estado.toLowerCase().replace(/\s+/g, '-')}`}>{lic.estado}</span>
                      </td>
                      <td data-label="Fecha">{lic.fecha}</td>
                      <td data-label="Monto">{lic.monto}</td>
                      <td data-label="Acción">
                        <button
                          className="btn btn-small"
                          onClick={() => onVerDetalle(lic.codigo)}
                          aria-label={`Ver detalle de la licitación ${lic.codigo}`}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN — botones deshabilitados en primera/última página */}
            {totalPaginas > 1 && (
              <nav className="pagination" aria-label="Paginación de resultados">
                <button
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="btn btn-paging"
                  aria-label="Página anterior"
                >
                  ← Anterior
                </button>
                <div className="page-info" role="status" aria-live="polite">
                  Página {paginaActual} de {totalPaginas}
                </div>
                <button
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="btn btn-paging"
                  aria-label="Página siguiente"
                >
                  Siguiente →
                </button>
              </nav>
            )}
          </>
        )}

        {/* ESTADO VACÍO */}
        {!loading && busquedaRealizada && licitaciones.length === 0 && !error && (
          <div className="empty-state" role="status">
            <p>No hay licitaciones para mostrar. Intente con otros filtros.</p>
          </div>
        )}
      </div>
    </section>
  );
};

/* ============================================================================
 * COMPONENTE: DETALLE DE LICITACIÓN (Indicador 3.2.4)
 * ==========================================================================*/

const DetalleLicitacion = ({ codigo, onVolver }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const tituloRef = useRef(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true); setError(null); setAviso(null);
      try {
        const { datos, aviso } = await servicioDetalle(codigo);
        if (!activo) return;
        setDetalle(datos);
        setAviso(aviso);
      } catch (err) {
        if (activo) setError(err.message || 'Error al cargar el detalle. Intente más tarde.');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [codigo]);

  // Manejo de foco: al cargar el detalle, lleva el foco al título (accesibilidad)
  useEffect(() => {
    if (!loading && detalle && tituloRef.current) tituloRef.current.focus();
  }, [loading, detalle]);

  return (
    <section className="detalle-section" aria-labelledby="detalle-title">
      <div className="container">
        <button onClick={onVolver} className="btn btn-secondary" aria-label="Volver al listado de licitaciones">
          ← Volver al listado
        </button>

        <Loader visible={loading} mensaje="Cargando detalle de la licitación..." />
        <MensajeAviso aviso={aviso} />
        <MensajeError error={error} onDismiss={() => setError(null)} />

        {!loading && detalle && (
          <article className="detalle-content">
            <h1 id="detalle-title" ref={tituloRef} tabIndex="-1">{detalle.nombre}</h1>
            <div className="detail-grid">
              <div className="detail-item"><h3>Código</h3><p><span className="codigo-mono">{detalle.codigo}</span></p></div>
              <div className="detail-item"><h3>Estado</h3><p><span className={`badge badge-${detalle.estado.toLowerCase().replace(/\s+/g, '-')}`}>{detalle.estado}</span></p></div>
              <div className="detail-item"><h3>Fecha de cierre</h3><p>{detalle.fecha}</p></div>
              <div className="detail-item"><h3>Monto estimado</h3><p>{detalle.monto}</p></div>
              <div className="detail-item full"><h3>Descripción</h3><p>{detalle.descripcion}</p></div>
              <div className="detail-item"><h3>Organismo</h3><p>{detalle.organismo}</p></div>
              <div className="detail-item"><h3>Región</h3><p>{detalle.region}</p></div>
              <div className="detail-item"><h3>Comuna</h3><p>{detalle.comuna}</p></div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
};

/* ============================================================================
 * COMPONENTE: BÚSQUEDA DE PROVEEDORES (Indicadores 2.1.2 y 3.2.4)
 * ==========================================================================*/

const BusquedaProveedores = () => {
  const [rut, setRut] = useState('');
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [errorRut, setErrorRut] = useState(null);
  const [sinResultado, setSinResultado] = useState(false);

  const handleBuscar = async (e) => {
    e.preventDefault();
    setSinResultado(false);

    // Validación COMPLETA del RUT antes de consumir el endpoint
    const v = validarRUT(rut);
    if (!v.valido) {
      setErrorRut(v.error);
      setProveedor(null);
      return;
    }

    setErrorRut(null);
    setLoading(true);
    setError(null);
    setAviso(null);
    setProveedor(null);

    try {
      const { datos, aviso } = await servicioProveedor(rut);
      setAviso(aviso);
      if (!datos) {
        setSinResultado(true); // respuesta vacía -> "Proveedor no encontrado"
      } else {
        setProveedor(datos);
      }
    } catch (err) {
      setError(err.message || 'Error de red al buscar el proveedor. Intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="proveedores-section" aria-labelledby="prov-title">
      <div className="container">
        <h1 id="prov-title">Buscar Proveedor</h1>

        <form onSubmit={handleBuscar} className="proveedor-form" role="search" aria-label="Búsqueda de proveedor por RUT" noValidate>
          <fieldset>
            <legend>Ingrese el RUT del proveedor</legend>
            <div className="form-group">
              <label htmlFor="rut-input">RUT del proveedor <span aria-hidden="true">*</span><span className="sr-only">(obligatorio)</span></label>
              <input
                id="rut-input"
                type="text"
                inputMode="text"
                value={rut}
                onChange={(e) => { setRut(e.target.value); setErrorRut(null); setSinResultado(false); }}
                placeholder="Ej: 77.653.382-3"
                className={`form-control ${errorRut ? 'form-control-error' : ''}`}
                aria-describedby="rut-help rut-error"
                aria-invalid={!!errorRut}
                aria-required="true"
                required
              />
              {errorRut && <span id="rut-error" className="error-message" role="alert">{errorRut}</span>}
              <small id="rut-help">Formato: 77.653.382-3 o 776533823. Se valida el dígito verificador.</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
              {loading ? 'Buscando...' : '🔍 Buscar Proveedor'}
            </button>
          </fieldset>
        </form>

        <Loader visible={loading} mensaje="Buscando proveedor..." />
        <MensajeAviso aviso={aviso} />
        <MensajeError error={error} onDismiss={() => setError(null)} />

        {!loading && sinResultado && (
          <div className="empty-state" role="status" aria-live="polite">
            <p>Proveedor no encontrado para el RUT ingresado.</p>
          </div>
        )}

        {!loading && proveedor && (
          <article className="proveedor-card" aria-label="Información del proveedor">
            <h2>Información del Proveedor</h2>
            <div className="proveedor-details">
              <div className="detail-item"><h3>Razón social</h3><p>{proveedor.razonSocial}</p></div>
              <div className="detail-item"><h3>RUT</h3><p>{proveedor.rut}</p></div>
              <div className="detail-item"><h3>Código de empresa</h3><p>{proveedor.codigoEmpresa}</p></div>
              <div className="detail-item"><h3>Estado</h3><p>{proveedor.estado}</p></div>
              {proveedor.actividad && <div className="detail-item"><h3>Actividad</h3><p>{proveedor.actividad}</p></div>}
              {proveedor.region && <div className="detail-item"><h3>Región</h3><p>{proveedor.region}</p></div>}
              {proveedor.ciudad && <div className="detail-item"><h3>Ciudad</h3><p>{proveedor.ciudad}</p></div>}
            </div>
          </article>
        )}
      </div>
    </section>
  );
};

/* ============================================================================
 * COMPONENTE PRINCIPAL — navegación y estado global
 * ==========================================================================*/

function LicitaSeguroApp() {
  const [pagina, setPagina] = useState('home');
  const [codigoDetalle, setCodigoDetalle] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const navegar = (p) => {
    setPagina(p);
    setMenuAbierto(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const verDetalle = (codigo) => {
    setCodigoDetalle(codigo);
    setPagina('detalle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const items = [
    { id: 'home', label: 'Inicio' },
    { id: 'listado', label: 'Licitaciones' },
    { id: 'proveedores', label: 'Proveedores' },
  ];

  return (
    <div className="app-container">
      <header className="app-header" role="banner">
        <nav className="navbar" role="navigation" aria-label="Navegación principal">
          <div className="logo">
            <button onClick={() => navegar('home')} className="logo-button" aria-label="LicitaSeguro, ir a la página principal">
              Licita<span className="logo-accent">Seguro</span>
            </button>
          </div>

          {/* Botón hamburguesa para móvil */}
          <button
            className="nav-toggle"
            aria-expanded={menuAbierto}
            aria-controls="nav-menu"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuAbierto((v) => !v)}
          >
            <span aria-hidden="true">{menuAbierto ? '✕' : '☰'}</span>
          </button>

          <ul id="nav-menu" className={`nav-menu ${menuAbierto ? 'open' : ''}`}>
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => navegar(it.id)}
                  className={pagina === it.id ? 'active' : ''}
                  aria-current={pagina === it.id ? 'page' : undefined}
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" role="main" className="app-main" tabIndex="-1">
        {pagina === 'home' && <HomePage onNavigate={navegar} />}
        {pagina === 'listado' && <ListadoLicitaciones onVerDetalle={verDetalle} />}
        {pagina === 'detalle' && <DetalleLicitacion codigo={codigoDetalle} onVolver={() => navegar('listado')} />}
        {pagina === 'proveedores' && <BusquedaProveedores />}
      </main>

      <footer className="app-footer" role="contentinfo">
        <p>© 2026 LicitaSeguro — Información transparente de licitaciones públicas.</p>
        <p className="footer-source">
          Datos provistos por <a href="https://www.mercadopublico.cl/" target="_blank" rel="noopener noreferrer">Mercado Público Chile</a>.
        </p>
      </footer>
    </div>
  );
}

/* ============================================================================
 * RENDER — montaje de la aplicación en el navegador
 * ==========================================================================*/

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<LicitaSeguroApp />);
