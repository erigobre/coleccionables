> Documento vivo. No se escribe código de la app hasta que este documento esté validado por el usuario y se reciba el "GO".
> Última actualización: 2026-09-20 — Autor: Claude (planeación) + iamkikelo@gmail.com (owner del producto)

# Plan Maestro — Frikidex

## DECISIONES CONFIRMADAS (2026-09-20)

| # | Pregunta bloqueante | Decisión |
|---|---|---|
| 1 | Motor de IA visual | **Gemini API** (multimodal, Google) |
| 2 | Framework móvil | **React Native + Expo** |
| 3 | Backend | **Backend propio con NestJS**, pero base de datos = **MariaDB/MySQL** en vez de PostgreSQL |
| 4 | Alcance MVP: ¿colecciones/ubicaciones compartidas en v1? | **NO** — se deja para **v1.1**. V1 lanza solo con cuentas/colecciones/ubicaciones individuales |

Estas decisiones ya están reflejadas en el resto del documento (stack en §3, checklist en §8).

## DECISIONES NO BLOQUEANTES CONFIRMADAS (2026-09-20)

| # | Tema | Decisión |
|---|---|---|
| 5 | Transferencia rechazada/sin respuesta | **Expira a los 7 días** sin respuesta → regresa automáticamente al remitente |
| 7 | Moneda | **Una sola moneda fija: MXN** |
| 8 | Fuente de precio de mercado | **Grounding con búsqueda web en tiempo real** (Gemini con grounding, no solo conocimiento del modelo) |
| 10 | Idioma v1 | **Solo español** |
| 9 | Tipo de cuenta | **Cuentas tipo familia/negocio desde v1** — ver nota de diseño abajo |
| 12 | Fotos por objeto | **Varias fotos** (frente/atrás/empaque/detalle) |
| 13 | Enlace público de objeto | **Página web pública simple**, sin necesidad de tener la app instalada. Se sirve bajo el dominio **frikidex.app** (ver decisión #11 de branding) |
| 6 | "¿Ya lo tengo?" sin match | Modal con mensaje **"Este objeto no se encuentra en tu colección, ¿deseas agregarlo de una vez o lo cargamos a wishlist?"** con 3 botones: **Agregar / Wishlist / Cancelar** |
| 11 | Branding | **CONFIRMADO (2026-09-20):** nombre **"Frikidex"**. Dominio principal **frikidex.com**; **frikidex.app** para marketing ("descárgala en frikidex.app") y para enlaces públicos de objetos / ligas de conexión para compartir (ver #13). **Identidad visual completa CONFIRMADA (2026-09-21):** paleta, tipografía (Bungee + DM Sans), botones, ícono y elementos gráficos — ver `docs/01-IDENTIDAD-VISUAL.md`, fuente de verdad para todo el trabajo de UI. Ya implementada en la app móvil (modo oscuro por defecto). |
| 14-20 | Features extra del roadmap | **Se incluyen todas**: offline-first (con badge "No sincronizado" en objetos pendientes de subir), exportar a PDF/Excel, búsqueda y filtros avanzados, estadísticas con gráficas, historial de cambios del objeto, modo checklist de QR para inventario anual |

**Nota de diseño importante — cuentas familia/negocio vs. "sin compartidos en v1":** para no contradecir la decisión bloqueante #4 (sin colecciones/ubicaciones compartidas en v1), la cuenta "familia/negocio" se modela así en v1: existe una entidad `Organization` (unidad de facturación/paquete SaaS) que agrupa varios `User` bajo un mismo plan pagado. Cada usuario dentro de la organización sigue teniendo **sus propias colecciones, objetos y ubicaciones individuales** (no compartidos entre sí todavía). Lo único que comparten en v1 es la suscripción/paquete. La colaboración real sobre una misma colección/ubicación (editar los objetos del otro, ver su contenido) sigue siendo v1.1, tal como se decidió. **Si esto no es lo que tenías en mente, dímelo antes de que avance más con el modelo de datos de organización/facturación.**

## 0. Resumen del producto

App móvil (Android + iOS) para inventariar coleccionables (juguetes, comics, art toys, esculturas, estatuas, pinturas, libros, etc.), con el objetivo principal de **responder rápido "¿ya lo tengo?"** al escanear un objeto. Incluye:

- App de usuario final (React Native recomendado — ver §3).
- Backend administrativo **superadmin** (web) para gestión de usuarios, estadísticas de uso, seguimiento de pagos mensuales por paquete, y activación de cuentas patrocinadas (gratis para siempre).
- Modelo de negocio: **SaaS de renta mensual por paquetes**. El detalle de cobro/paquetes se define en Fase 2 de negocio, pero el modelo de datos debe contemplarlo desde ahora (ver §5.9).
- Identificación de objetos asistida por IA visual a partir de foto/código de barras (ver §1 — **alerta técnica importante**).

---

## 1. ALERTA TÉCNICA — "Google Lens API" (léase antes de todo)

El requerimiento pide usar "la API de Google Lens" para extraer del objeto: nombre, si está suelto/en blister, tipo de objeto, sugerencia de colección, marca, precio promedio, edición, línea/modelo, escala/altura, diseñador, año, número de set, identificador único, y (si es comic) cover/escritor/dibujante/entintor.

**Precisión necesaria:** Google no ofrece una "API de Google Lens" pública para terceros que devuelva este tipo de metadatos estructurados de coleccionables. Lo que sí existe y es viable hoy:

| Necesidad | Tecnología real recomendada |
|---|---|
| Reconocer visualmente el objeto y "entender" qué es (como hace Lens en la app de Google) | **Gemini API (multimodal, Google)** — se le manda la foto + un prompt pidiendo un JSON estructurado con los campos exactos que necesitamos. Es lo más parecido en espíritu a "Lens" y es de Google. |
| Alternativa/fallback | GPT-4o/GPT-5 vision (OpenAI) o Claude con visión — mismo patrón de prompt → JSON. |
| Leer código de barras (UPC/EAN) | Librería nativa en el dispositivo: **ML Kit Barcode Scanning** (Android/iOS vía `react-native-vision-camera` + `vision-camera-code-scanner` o `expo-camera` con `BarcodeScanning`). Esto NO es IA, es lectura directa del código. |
| Buscar producto por código de barras leído | Servicio de lookup (UPCItemDB, Barcode Lookup API, o el propio modelo de IA con "web grounding"/búsqueda) |
| Precio promedio de mercado actual | Gemini/GPT con "grounding" de búsqueda web, o scraping/API de marketplaces (eBay, MercadoLibre, Amazon) — variable según disponibilidad legal por país |

**Esto es una pregunta bloqueante para el usuario** (ver §9, pregunta 1). El resto de este documento asume que usaremos **Gemini API multimodal** como motor principal de reconocimiento + ML Kit para códigos de barra, pero se ajustará según tu respuesta.

---

## 2. Modelo de negocio (para tener en mente desde ya)

- App de **renta mensual (SaaS)** por paquetes (paquetes a definir en fase 2).
- Superadmin puede **activar cuentas patrocinadas** que nunca pagan (flag `sponsored: true` en el usuario, se salta toda la lógica de cobro).
- El **modelo de datos de usuario y suscripción se construye desde la Fase 1** aunque la pasarela de pago (Stripe u otra) y la UI de selección de paquete se implementen en Fase 2 de negocio.
- Backend superadmin (Fase 1) debe mostrar, aunque sea con datos mock/manuales al inicio: lista de usuarios, plan actual, estado de pago (al día / vencido / patrocinado), estadísticas de uso (objetos creados, colecciones, escaneos IA realizados, usuarios activos).

---

## 3. Stack tecnológico propuesto

| Capa | Propuesta | Por qué |
|---|---|---|
| App móvil | **React Native + Expo** (Expo Router, TypeScript) | Un solo código para Android/iOS, ecosistema maduro de cámara/QR/blur, hot reload rápido, fácil de mandar a build con EAS |
| UI / diseño | **NativeWind (Tailwind para RN)** + `expo-blur` para las barras "glass" + `react-native-reanimated` para animaciones (transferencia estilo Pokémon, transiciones tipo Tinder) | Permite look premium consistente, glassmorphism real (blur nativo, no solo opacidad), animaciones fluidas a 60fps |
| Cámara / escaneo | `expo-camera` (foto) + `expo-camera` `CameraView` Barcode Scanning (o `react-native-vision-camera` si necesitamos más control) | Cubre foto de objeto y lectura de barcode con la misma librería |
| Backend API | **Node.js + NestJS** + TypeScript | Tipado compartido con el front, estructura modular ideal para permisos complejos (colecciones/ubicaciones compartidas) — **CONFIRMADO** |
| Base de datos | **MariaDB/MySQL** vía **Prisma ORM** | **CONFIRMADO por el usuario.** Nota técnica: las sub-ubicaciones anidadas (Bodega1→EstanteB→Caja7) se modelan como lista de adyacencia (`location.parent_id`) y se recorren con **recursive CTE** (`WITH RECURSIVE`), soportado desde MySQL 8.0 / MariaDB 10.2+ — confirmar en Fase 0 qué motor/versión exacta usará el hosting para no perder esta capacidad. Prisma soporta MySQL sin problema; solo se pierden ciertas comodidades de Postgres (JSONB avanzado, RLS nativo) que no son indispensables para el diseño de permisos de §7.1, que se resuelve a nivel de aplicación (NestJS), no a nivel de base de datos. |
| Storage de imágenes | **Cloudflare R2** o **AWS S3** (compatible), con pipeline de compresión (sharp / squoosh) a baja resolución antes de guardar | Barato, y cumple el requerimiento de "bajo peso sin perder calidad de identificación" |
| Auth | JWT (access + refresh) propio (NestJS Passport) | Backend propio confirmado, no se usa Supabase/Clerk |
| Backend administrativo (superadmin) | **Next.js** (web) + `shadcn/ui` + Tailwind, consumiendo la misma API | Dashboard moderno, rápido de construir, reutiliza el backend de la app |
| IA visual | **Gemini API** (ver §1) — **CONFIRMADO** | — |
| Notificaciones push | Expo Notifications (para avisos de temporada, transferencias recibidas) | Integrado nativamente con Expo |
| Generación de QR | `react-native-qrcode-svg` (generar) + el propio escáner de cámara (leer) | — |

---

## 4. Módulos y navegación

Bottom tab bar (glass/blur, estilo Apple/Instagram) con 5 secciones:

**Home | Colecciones | Objetos | WishList | Perfil**

El botón flotante "+" de Objetos vive dentro de esa sección (no en la tab bar global), pegado siempre abajo a la derecha.

---

## 5. Auditoría detallada por módulo (cada requerimiento del brief, enumerado)

### 5.1 HOME
1. [ ] Sección 1 — Tarjetas de estadísticas: total objetos, total wishlist.
2. [ ] Si el usuario no tiene objetos: mostrar botón "Agrega tu primer objeto a tu colección" → navega al flujo de escaneo (Objetos → cámara).
3. [ ] Sección 2 — Botón "¿Ya lo tengo?" + texto "Escanea el objeto y descubre si ya lo tienes!".
4. [ ] Al tocar, abre cámara, toma/analiza foto, y el sistema determina automáticamente (matching contra la colección del usuario) si el objeto ya existe.
5. [ ] Si existe: mostrar "card" con foto + nombre + ubicación + "desde cuándo se tiene" + estado (nuevo/usado/abierto).
6. [ ] Esa card es clickeable → lleva al perfil detallado del objeto (§5.3.9).
7. [ ] Debajo: título "Objetos similares" + lista de cards de objetos parecidos, ordenados por relevancia/cantidad de coincidencias de datos (algoritmo de similitud a definir, ver §7.2).
8. [ ] Si no hay similares: no mostrar la sección, e invitar a entrar a "Objetos" para cargar artículos.
9. [ ] Sección 3 — Carrusel/rotador de cards de objetos marcados como favoritos.

**Pendiente de definir:** ¿Qué pasa si el escaneo de "¿ya lo tengo?" no reconoce nada o el objeto es 100% nuevo? (Propuesta: ofrecer botón directo "Agregar como nuevo objeto" prellenando con lo que sí se detectó.)

### 5.2 COLECCIONES
1. [ ] Vista grid (cuadrícula) con diseño premium de las colecciones actuales.
2. [ ] Botón "Agregar/Editar colecciones" debajo del grid.
3. [ ] Colecciones por default (se crean automáticamente al registrar usuario): Libros, Comics, Juguetes, ArtToys, Esculturas, Pinturas, Estatuas.
4. [ ] Orden por default: por relevancia = mayor cantidad de objetos, descendente.
5. [ ] Vista de edición (lista, no grid): permite:
   - [ ] Eliminar colección — solo si vacía; si tiene objetos, forzar flujo de "migrar objetos a otra colección" antes de permitir eliminar.
   - [ ] Crear colección nueva (nombre + ícono/imagen).
   - [ ] Suspender colección: deja de aparecer en la vista de Colecciones; si tiene objetos, no se pueden **agregar objetos nuevos** a ella mientras esté suspendida, pero los objetos existentes se siguen viendo (en Objetos y en su colección alterna si tiene más de una), mostrando etiqueta "Este objeto se encuentra en una colección suspendida".
6. [ ] **[DIFERIDO A v1.1]** Colecciones compartidas: el owner puede invitar a otro usuario como **editor/admin** de la colección.
   - [ ] Ambos usuarios pueden agregar/eliminar objetos de esa colección.
   - [ ] Pueden gestionar (agregar/quitar) usuarios ligados a la colección.
   - [ ] Cada usuario ve, dentro de su propia app, los objetos de esa colección compartida como si fueran propios (control total).
   - [ ] **Regla compleja marcada por el usuario:** al compartir una colección, automáticamente se debe compartir el acceso a las **ubicaciones** correspondientes a los objetos de esa colección (ver §5.5.5 y §7.1 — diseño de permisos).
   - *Nota: el modelo de datos (tablas `collection_members`, `location_members`) se deja preparado desde v1 aunque la UI/lógica de invitación no se construya hasta v1.1, para no tener que migrar esquema después.*

### 5.3 OBJETOS
1. [ ] Cards tipo "resultado de búsqueda de Amazon": rectangular, imagen a la izquierda en ratio 9:16.
2. [ ] Sobre la imagen: botón de favorito (corazón) + ícono para agregar a una colección existente (un objeto puede pertenecer a 1 o varias colecciones).
3. [ ] Lado derecho de la card: nombre, colección(es), desde cuándo se tiene, estado (nuevo/usado/abierto), ubicación actual, botón **"Ver más detalles"**.
4. [ ] Esquina superior derecha: botón compartir → genera URL pública con perfil simplificado (nombre, estado, fecha de producción, marca, medidas, foto).
5. [ ] Botón flotante circular "+" fijo abajo a la derecha, siempre visible en esta sección.
6. [ ] Al tocar "+": abre cámara para foto de objeto o de código de barras, con botón de captura.
7. [ ] Tras la foto: modal de preview + confirmación de buena iluminación/calidad.
8. [ ] Botón grande y llamativo **"Analizar"** (implica autorización de enviar la foto a IA) + link de texto abajo **"No gracias, llenaré los datos manualmente"**.
9. [ ] Ambos caminos llevan al formulario de alta de objeto:
   - [ ] Si vino de "Analizar": campos prellenados con lo que la IA detectó; lo no detectado queda vacío/sin seleccionar.
   - [ ] Si vino de manual: formulario 100% vacío.
10. [ ] **Campos del formulario** (obligatorios sugeridos por el usuario + propuestas mías, ver §6).
11. [ ] Textarea "Notas" libre al final del formulario.
12. [ ] Etiquetas (tags) autogeneradas por IA según categoría (ej. color principal, franquicia/personaje) — usuario puede agregar/quitar tags libremente. El prompt a la IA siempre debe pedir sugerencia de "color principal" como tag.
13. [ ] Fotos se guardan en **baja resolución** (mínimo peso, suficiente para identificar el objeto).
14. [ ] Select de "Ubicación/Locación" — se llena con las ubicaciones precargadas desde Perfil; opción por default preseleccionada: **"Sin ubicación"**.

### 5.3.9 Perfil del objeto (detalle)
1. [ ] Layout estilo "perfil de Tinder": foto principal grande arriba, datos debajo.
2. [ ] Actualizar ubicación con un click, incluyendo si el cambio es: **Indefinido**, **Temporal** o **Vendido/Donado/Perdido**.
3. [ ] Flujo "Vendido" = transferencia a otro usuario:
   - [ ] Animación tipo "envío de Pokémon" (breve, cuidada).
   - [ ] El otro usuario recibe un modal "Acabas de recibir un objeto" con **Aceptar/Rechazar**.
   - [ ] Si acepta: elige a qué colección propia agregarlo; el objeto pasa a ser suyo.
   - [ ] Si rechaza: ¿qué pasa? — **pendiente de definir con el usuario** (propuesta: el objeto vuelve al estado anterior del remitente, con notificación de rechazo).
4. [ ] Tras la venta/transferencia, el objeto desaparece de "Objetos" y de la colección del vendedor original.
5. [ ] En búsquedas (cámara o manual) debe aparecer al final una sección **"Objetos vendidos que se relacionan con tu búsqueda"**, visualizables como perfil normal pero:
   - [ ] Status = "Vendido".
   - [ ] **Completamente no editable** (bloqueo total de edición).
6. [ ] Si el usuario vuelve a comprar el "mismo" objeto, se guarda como **entrada independiente/nueva** (no se reactiva la vendida).
7. [ ] Cambios de ubicación **temporales** ligados a **Temporadas** (Halloween, Navidad, Pascua, etc., creadas en Perfil con fecha inicio/fin — solo informativo, no mueve nada automáticamente).
8. [ ] En Perfil → sección "Temporadas": al entrar a una temporada (ej. Halloween) se listan todos los objetos actualmente asignados a ella, mostrando: ubicación principal, ubicación actual, y botón rápido "Ya lo regresé a su ubicación principal" (estilo lista de supermercado, se va "tachando").
9. [ ] Modal de cambio de ubicación, multi-paso:
   - [ ] Paso 1: destino — select de ubicaciones precargadas + opciones especiales **Vendido / Donado / Perdido**.
   - [ ] Si se elige ubicación existente → Paso 2: ¿el cambio es **Indefinido** o **Temporal**?
   - [ ] Si es Temporal → Paso 3: elegir a qué **Temporada** se liga.
10. [ ] Botón **"Solicitar precio actual promedio de mercado"**:
    - [ ] Compara contra el precio de compra registrado (si existe), si no, solo muestra el precio de mercado/promedio.
    - [ ] Usa el motor de IA (mismo backend, prompt específico solo de precio).
    - [ ] Indica disponibilidad: Disponible / Agotado / No en mercado, + links a dónde comprarlo.

### 5.4 WISHLIST
1. [ ] Lista objetos que el usuario quiere/le gustaría comprar.
2. [ ] **No se agrega directamente aquí** — se agrega desde el flujo "¿Ya lo tengo?" de Home cuando el resultado es "No lo tienes" → opción de marcarlo como Wishlist.
3. [ ] Permite edición manual de: "dónde lo encontraste" y "precio en que lo viste".

### 5.5 PERFIL (usuario)
1. [ ] Gestión de **Ubicaciones**: crear/editar/eliminar, con **sub-ubicaciones** anidadas (ej. Bodega 1 → Estante B → Caja 7; Casa → Sala).
2. [ ] Generar **código QR** por ubicación (para imprimir y pegar físicamente).
3. [ ] Al escanear el QR: abre la app y muestra todos los objetos de esa ubicación **+ sub-ubicaciones dependientes**.
4. [ ] **Privacidad de QR:** si alguien escanea el código sin tener permiso sobre esa ubicación, no debe ver el contenido — solo usuarios en la lista de compartidos/ligados a esa ubicación. *(En v1, con cuentas individuales, esto se reduce a: solo el owner puede ver el contenido al escanear; la lista de compartidos llega en v1.1.)*
5. [ ] **[DIFERIDO A v1.1]** Las ubicaciones pueden tener **múltiples usuarios asignados** con permisos de acceso.
6. [ ] **[DIFERIDO A v1.1]** Al compartir una colección, se debe otorgar automáticamente acceso a las ubicaciones de los objetos contenidos en ella (regla compleja — diseño detallado en §7.1).
7. [ ] Ubicación por default = **"Ubicación permanente"** (tipo de ubicación, no confundir con "Sin ubicación" que es la que trae el objeto al crearse).
8. [ ] Gestión de **Temporadas**: crear con nombre + fecha inicio + fecha fin.

### 5.6 Backend Superadmin
1. [ ] Listado de usuarios de la app.
2. [ ] Estadísticas de uso (objetos totales, colecciones totales, escaneos IA/mes, usuarios activos, etc. — definir set exacto de KPIs).
3. [ ] Seguimiento de pagos mensuales según paquete adquirido (modelo de datos ahora, UI de cobro real en fase 2 de negocio).
4. [ ] Activar **cuentas patrocinadas** (flag que exime de pago para siempre).

### 5.7 Transversal / requisitos de UI-UX
1. [ ] UI cuidada, tecnologías/framework modernos.
2. [ ] Bottom nav bar principal con efecto **glass** (blur real, estilo Apple/Instagram).
3. [ ] Cards con diseño consistente y premium en todas las secciones.
4. [ ] Animaciones cuidadas: transferencia "Pokémon", transición estilo Tinder en perfil de objeto.

---

## 6. Propuesta de campos del formulario de alta de objeto (mejora sobre lo solicitado)

El usuario pidió una lista base y explícitamente pidió propuestas de mejora. Propuesta final de campos:

**Genéricos (todas las categorías):**
- Nombre del objeto *(obligatorio)*
- Foto(s) — permitir más de 1 foto (frente/atrás/empaque), no solo una
- Categoría/Tipo *(obligatorio, select)*: Libro, Comic, Art Toy, Estatua, Figura de acción, Juguete, Escultura, Pintura, Otro
- Condición de empaque *(obligatorio, select)*: Suelto / En blister (sellado) / En blister (abierto) / Con caja (sin blister)
- Estado *(obligatorio, select)*: Nuevo / Usado / Abierto — *(nota: sugiero separar "condición de empaque" de "estado de uso" porque son dos ejes distintos; el brief los mezclaba)*
- Marca/Fabricante
- Línea de juguete / Modelo
- Edición (ej. "Edición limitada", "1ra edición")
- Escala/Altura (con unidad: cm/in/escala 1:6 etc.)
- Diseño/Diseñador
- Año de lanzamiento
- Número de set original
- Identificador único (SKU/UPC/ISBN si aplica)
- Precio de compra
- Moneda *(propuesta nueva — el usuario no lo mencionó pero es necesario si habrá comparativas de mercado)*
- Lugar de compra
- Fecha de adquisición *(propuesta nueva — necesaria para "desde cuándo se tiene", que la card de Home requiere y el brief no dice cómo se captura)*
- Propietario (si la colección es compartida, quién de los miembros es el dueño físico)
- Ubicación (select, default "Sin ubicación")
- Colección(es) — multi-select, puede ser una o varias
- Tags/Etiquetas (auto + manuales)
- Notas (textarea libre)

**Solo si Categoría = Comic/Libro:**
- Número de cover
- Escritor (guionista)
- Dibujante (penciler)
- Entintor (inker)
- *(propuesta) Colorista*
- *(propuesta) Editorial*
- *(propuesta) Número de issue / volumen*

**Campos que propongo agregar, fuera de lo pedido, por ser casi gratis y de mucho valor:**
- Estado de conservación físico (Mint / Near Mint / Buen estado / Con detalles) — útil para reventa futura, distinto de "Nuevo/Usado".
- Cantidad (por si el usuario tiene duplicados del mismo ítem — evita crear N registros idénticos a mano).
- Favorito (boolean, ya contemplado por el corazón en la card).
- Es regalo/herencia (boolean) — algunos coleccionistas quieren distinguir compras propias vs regalos, afecta el "precio de compra" (puede quedar vacío legítimamente).

---

## 7. Diseño de lógicas complejas (a resolver antes de programar esos módulos)

### 7.1 Permisos de Colecciones ↔ Ubicaciones (la que el usuario marcó como "compleja")
Propuesta de modelo:
- Tabla `collection_members(collection_id, user_id, role: owner|editor)`.
- Tabla `location_members(location_id, user_id, role: owner|viewer, source: manual|inherited_from_collection)`.
- Cuando se agrega un `collection_member`, el sistema recorre todos los objetos de esa colección, obtiene sus `location_id` (y ubicaciones padre en la jerarquía), y crea/asegura un `location_members` con `source = inherited_from_collection` para ese usuario.
- Si luego un objeto cambia de ubicación o se quita de la colección, hay que **recalcular** el acceso heredado (job o trigger) — importante decidir si es síncrono (al momento) o batch (cron cada X minutos). **Propuesta: síncrono**, dado el volumen esperado (bajo, es una app de nicho, no miles de escrituras/seg).
- Un usuario puede tener acceso a una ubicación por dos vías (manual directo + heredado); si se le quita el acceso manual, debe conservar el heredado si sigue siendo miembro de una colección con objetos ahí.
- Al escanear un QR de ubicación: el backend valida `location_members` (directo o heredado) antes de devolver el contenido.

### 7.2 Algoritmo de "objetos similares" (Home) y "matching" de ¿ya lo tengo?
Propuesta simple para v1 (sin necesidad de vectores/embeddings al inicio):
- Score de similitud = coincidencias ponderadas entre: mismo personaje/nombre detectado (peso alto), misma marca/fabricante (peso medio), misma línea/modelo (peso medio), misma categoría (peso bajo), tags en común (peso bajo).
- Orden descendente por score; se muestran solo los que superan un umbral mínimo.
- V2 (futuro): usar embeddings de texto (o incluso de imagen) para similitud semántica real en vez de reglas manuales.

### 7.3 Transferencia de objetos ("vendido" estilo Pokémon)
- Estado del objeto pasa a `pending_transfer` en cuanto se inicia (no "vendido" todavía) para que no desaparezca antes de que el receptor confirme.
- Si el receptor rechaza o no responde en X días (definir), el objeto regresa a `active` en la colección original — **pendiente confirmar con el usuario el comportamiento y el timeout**.
- Solo al **aceptar** pasa a `sold` en el registro original (inmutable) y se crea un **nuevo objeto** en la cuenta del receptor (no se "mueve" el mismo registro, para no perder el histórico "vendido").

---

## 8. Checklist de implementación por fases (orden sugerido)

> Nada de esto se ejecuta hasta recibir el "GO" del usuario.

- [ ] **Fase 0 — Decisiones y setup**
  - [ ] Resolver preguntas bloqueantes (§9)
  - [ ] Definir identidad visual (paleta, tipografía, ícono app)
  - [ ] Inicializar repo (monorepo: `app/`, `api/`, `admin/`), git, CI básico
  - [ ] Prototipo visual de la tab bar glass + 1 pantalla, para validar el "feel" antes de construir todo

- [ ] **Fase 1 — Backend base**
  - [ ] Modelado de base de datos completo (todas las entidades de §5)
  - [ ] Auth (registro/login/refresh)
  - [ ] CRUD de Usuario, incluyendo flags `sponsored`, `plan`, `subscription_status`
  - [ ] Storage de imágenes + pipeline de compresión

- [ ] **Fase 2 — App móvil: esqueleto**
  - [ ] Navegación con tab bar glass (5 secciones)
  - [ ] Theming (NativeWind/design tokens)
  - [ ] Pantallas de login/registro

- [x] **Fase 3 — Perfil: Ubicaciones y Temporadas** *(se hace antes que Objetos porque Objetos depende de tener ubicaciones)* — **hecho 2026-09-20**
  - [x] CRUD ubicaciones + sub-ubicaciones (árbol, recursive CTE en MySQL/MariaDB)
  - [x] Generación de QR (backend ya generaba el PNG; UI de Perfil → Ubicaciones lo muestra)
  - [x] Escaneo de QR con cámara *(2026-09-21; Perfil → Ubicaciones → "Escanear QR de ubicación": `CameraView` solo QR → `GET /locations/scan/:token` → lista los objetos de la ubicación y sus sub-ubicaciones, excluye vendidos y marca "Ahora está en: X" los que andan fuera de lugar; error 403/404 con reintento. **Falta probar en dispositivo**)*
  - [x] CRUD Temporadas + checklist de objetos asignados ("Ya lo regresé a su ubicación principal")
  - [ ] *(v1.1)* Compartir ubicación (miembros manuales)

- [x] **Fase 4 — Colecciones**
  - [x] Colecciones default al crear cuenta
  - [x] Grid + orden por relevancia
  - [x] CRUD, suspender, migrar objetos al eliminar
  - [x] Modelo de datos preparado para `collection_members` (sin UI de invitación aún)
  - [ ] *(v1.1)* Compartir colección (invitar editor/admin) + herencia de permisos de ubicación (§7.1)

- [ ] **Fase 5 — Objetos** *(código completo 2026-09-21, sin commit/deploy ni prueba en dispositivo — ver nota al final)*
  - [x] Listado tipo Amazon + favoritos + multi-colección
  - [x] Botón flotante "+" → cámara → preview → Analizar/Manual *(2026-09-21; `objetos/captura.tsx`: foto o galería hasta 4 fotos, preview con aviso de calidad, "Analizar" o "No gracias, llenaré los datos manualmente". Verificado: tsc + expo export + `POST /items/analyze` en producción. **Falta probar en dispositivo real**)*
  - [x] Integración IA visual (Gemini) + prompt de extracción de campos + tags *(backend ya estaba; la app manda las fotos a `/items/analyze`, prellena el formulario y ofrece los `suggestedTags`, que se crean hasta guardar)*
  - [x] Lectura de código de barras *(2026-09-21; modo "Código de barras" lee EAN/UPC y `POST /items/lookup-barcode` (Gemini + Google Search) prellena el formulario; si no encuentra el producto deja solo el código en "Identificador único". Verificado en producción con un EAN real, uno inventado y una entrada no numérica; **falta probar con un coleccionable real y en dispositivo**)*
  - [x] Formulario completo (§6) con prellenado *(manual o prellenado por IA desde la cámara)*
  - [x] Perfil de objeto estilo Tinder *(foto grande + panel que sube con spring; toque en el 35% izquierdo/derecho de la foto o deslizar para cambiar de foto. **Falta probar el gesto en dispositivo**)*
  - [x] Modal de cambio de ubicación multi-paso
  - [x] Flujo de transferencia/venta (animación + aceptar/rechazar) (§7.3) *(botón "Vendido" → correo del receptor → animación de cápsula con Reanimated → pendiente 7 días; receptor ve "¡Acabas de recibir un objeto!" en Objetos → Transferencias, elige colección y acepta o rechaza; el emisor puede cancelar (borra la transferencia y devuelve el objeto a ACTIVE); un objeto en PENDING_TRANSFER no se puede editar. **Corrige fuga real:** `findIncoming`/`findOutgoing` devolvían el `User` completo de la contraparte, incluido `passwordHash`; ahora solo `id/name` (`email` en el receptor). **Falta probar la animación en dispositivo**)*
  - [x] Sección "objetos vendidos relacionados" en resultados de búsqueda *(buscador en Objetos; con ≥2 letras consulta `GET /items/sold?search=` (nombre/marca/línea/edición/identificador) y muestra tarjetas de solo lectura con insignia "Vendido"; la integración con "¿Ya lo tengo?" de Home se hace en Fase 6 reutilizando `match` → `soldMatches`)*
  - [x] Botón de precio de mercado (IA) *(verificado en vivo contra Gemini con facturación activada 2026-09-21 — respuesta exitosa real con precio, disponibilidad y link de referencia; extendido el mismo día para incluir "notas de coleccionista" (rareza/tirada/variantes) en la misma llamada, sin repetir campos ya conocidos, con botón "Usar sugerencia en Notas" en la ficha)*
  - [x] Compartir objeto (URL pública simplificada) *(botón "Compartir enlace" en la ficha → `POST /items/:id/share` (reusa la tabla `share_links` existente, token aleatorio de 144 bits, idempotente) → hoja nativa de compartir; `DELETE /items/:id/share` lo revoca. `GET /s/:token` sirve una página HTML sin login (nombre, estado, marca, línea, edición, escala, año, empaque, uso, conservación, fotos; nunca precio/notas/ubicación/dueño), con todo escapado, CSP estricta y `noindex`; vendidos/donados/perdidos devuelven 404 con página amable. Base de la URL: `PUBLIC_BASE_URL` si existe (poner `https://frikidex.app` al configurar el dominio), si no el host de la petición)*

- [x] **Fase 6 — Home** *(codeado 2026-09-21; falta desplegar el backend y probar en dispositivo)*
  - [x] Cards de estadísticas + CTA primer objeto *(objetos totales y wishlist, tocables; sin objetos muestra el CTA "Agregar objeto")*
  - [x] Flujo "¿Ya lo tengo?" (cámara + matching) (§7.2) *(pantalla `objetos/ya-lo-tengo`: hasta 3 fotos → `POST /items/identify` (la IA extrae y se compara, sin guardar fotos) → "¡Ya lo tienes!" solo si `hasMatch` (puntaje ≥ umbral fuerte Y nombres con solapamiento Jaccard ≥ 0.6, para evitar falsos positivos); si no, "Parece que no lo tienes" con Agregar a colección / Agregar a wishlist / Cancelar)*
  - [x] Objetos similares *(lista de coincidencias parciales con foto, ubicación y fecha; más vendidos relacionados con insignia)*
  - [x] Carrusel de favoritos

- [x] **Fase 7 — Wishlist** *(codeado 2026-09-21)*
  - [x] Alta desde flujo "¿Ya lo tengo?" → No lo tengo → Wishlist *(sube la primera foto y crea el elemento con nombre/categoría detectados)*
  - [x] Edición manual (dónde lo viste / precio) *(hoja modal con dónde lo viste, precio y notas; quitar con confirmación)*

- [ ] **Fase 8 — Notificaciones**
  - [ ] Push de temporada ("recuerda regresar tus objetos de Halloween")
  - [ ] Push de transferencia recibida

- [ ] **Fase 9 — Backend Superadmin (web)**
  - [ ] Listado de usuarios + búsqueda/filtros
  - [ ] Dashboard de estadísticas de uso
  - [ ] Vista de pagos por usuario (manual al inicio, ligada a Stripe en Fase de negocio 2)
  - [ ] Toggle de cuenta patrocinada

- [ ] **Fase 10 — SaaS/Pagos (fase 2 de negocio, no bloquea lanzamiento v1 según lo dicho por el usuario)**
  - [ ] Definir paquetes y precios
  - [ ] Integración pasarela de pago (Stripe u otra)
  - [ ] Enforcement de límites por paquete (ej. máx. objetos, máx. colaboradores)

- [ ] **Fase 11 — QA y pulido**
  - [ ] Pruebas de los flujos de permisos compartidos (colección/ubicación) — foco especial, es lo más propenso a bugs
  - [ ] Pruebas de compresión de imagen (peso vs. legibilidad)
  - [ ] Pruebas en dispositivo real de cámara/QR/barcode (iOS y Android)
  - [ ] Revisión de política de privacidad (fotos, cámara, datos de ubicación física)

- [ ] **Fase 12 — Deploy**
  - [ ] Build EAS (iOS/Android), assets de tienda, screenshots
  - [ ] Envío a App Store y Google Play
  - [ ] Deploy de API y del admin web

---

## 9. Preguntas y decisiones pendientes del usuario

**Bloqueantes — YA RESUELTAS (ver "Decisiones confirmadas" al inicio del documento):**

1. ~~IA de reconocimiento visual~~ → **Gemini API**.
2. ~~Framework móvil~~ → **React Native + Expo**.
3. ~~Backend~~ → **NestJS + MariaDB/MySQL** (propio, no Supabase/Firebase).
4. ~~Alcance MVP~~ → **Sin compartidos en v1**, se agregan en v1.1.

**No bloqueantes pero necesarias antes de programar el módulo correspondiente:**

5. ¿Qué pasa si el receptor de una transferencia ("vendido") **rechaza** el objeto, o no responde? (propuse: vuelve al remitente; falta definir timeout, si lo hay).
6. En el matching de "¿ya lo tengo?", si la IA no logra identificar nada reconocible, ¿qué mensaje/flujo mostramos?
7. ¿En qué moneda(s) se registran los precios? ¿la app debe soportar multi-moneda si hay usuarios en distintos países?
8. Para el precio promedio de mercado: ¿hay algún marketplace específico que te interese usar como referencia (eBay, MercadoLibre, Amazon), o basta con que la IA dé un estimado con su propio conocimiento/búsqueda?
9. ¿La cuenta de usuario es siempre "una persona" o también planeas cuentas tipo "familia/negocio" con varios miembros desde el inicio (más allá de compartir colecciones puntuales)?
10. Idioma de la app: ¿solo español, o también inglés desde v1 (afecta si armamos i18n desde el inicio, más barato hacerlo ahora que después)?
11. ¿Tienes ya identidad de marca (nombre final de la app, logo, paleta de colores) o lo definimos juntos en Fase 0?
12. Límite de fotos por objeto: ¿1 sola o permitimos varias (frente, atrás, empaque, detalle)? (yo propuse varias en §6).
13. ¿Deseas que el enlace público para compartir un objeto (§5.3.4) sea accesible sin necesidad de tener la app instalada (vista web simple), o solo abre dentro de la app si el que lo recibe ya la tiene?

**Sugerencias de mejora / features adicionales (para que decidas si entran o no):**

14. Modo "offline-first" — poder agregar objetos sin internet y sincronizar después (muy valorado en bodegas sin señal).
15. Exportar el inventario completo a PDF/Excel (útil para seguros, herencias, o venta de colección completa).
16. Búsqueda y filtros avanzados en Objetos (por marca, año, colección, ubicación, estado, rango de precio).
17. Modo "vista rápida" en escaneo de ubicación (QR) tipo checklist para inventarios físicos anuales.
18. Estadísticas personales en Perfil: valor total estimado de la colección, objeto más valioso, distribución por categoría (gráficas).
19. Historial de cambios de un objeto (línea de tiempo: comprado → movido → vendido) — le da mucho valor a "objetos vendidos" y a QA de disputas.
20. Sistema de "colecciones sugeridas" cuando se detecta un objeto nuevo por IA (ya lo mencionaste como "fase futura" — solo lo dejo anotado para no perderlo).

---

## 10. Segunda auditoría (verificación de cobertura)

Repaso cruzado: cada bloque del brief original del usuario está mapeado a una sección de este documento.

| Bloque del brief | Cubierto en |
|---|---|
| Multiplataforma + UI cuidada + framework moderno | §3, §5.7 |
| Glass bottom nav | §3, §4, §5.7 |
| Backend superadmin: usuarios, estadísticas, pagos | §2, §5.6, Fase 9 |
| Cuentas patrocinadas | §2, §5.6 |
| SaaS renta mensual / paquetes (fase 2 negocio) | §2, Fase 10 |
| Google Lens / campos a extraer | §1, §6, Fase 5 |
| Home (3 secciones completas) | §5.1, Fase 6 |
| Colecciones (grid, default, orden, CRUD, suspensión, compartir) | §5.2, §7.1, Fase 4 |
| Objetos (cards, favoritos, multi-colección, compartir, botón +, cámara, análisis, formulario, tags, baja resolución, ubicación default) | §5.3, §6, Fase 5 |
| Perfil de objeto (Tinder-style, cambio ubicación, transferencia, vendidos en búsqueda, temporadas, precio mercado) | §5.3.9, §7.2, §7.3, Fase 5 |
| Wishlist | §5.4, Fase 7 |
| Perfil usuario: ubicaciones + sub-ubicaciones + QR + privacidad + multi-usuario + temporadas | §5.5, §7.1, Fase 3 |
| Petición explícita de "propuestas de mejora en inputs" | §6 |
| Petición de auditoría + checklist + segunda auditoría + preguntas antes de programar | Este documento completo |

**Conclusión de la segunda auditoría:** no se detectan puntos del brief original sin mapear. Los huecos que sí existen son de **decisión** (preguntas §9), no de **omisión** — es decir, ya están identificados y listados, solo falta que el usuario los resuelva.

---

## 11. Regla de oro para esta planeación

No se escribirá una sola línea de código de la app (móvil, backend o admin) hasta que:
1. El usuario haya respondido las preguntas bloqueantes (§9, puntos 1-4).
2. El usuario confirme o ajuste el checklist de fases (§8).
3. El usuario dé la palabra explícita de "GO" para comenzar a programar.
