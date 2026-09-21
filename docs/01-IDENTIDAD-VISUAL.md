> Documento vivo. Confirmado por el usuario el 2026-09-21. Es la fuente de verdad para
> TODO el trabajo de UI del proyecto (app móvil, admin web, marketing) — ver también
> `docs/00-PLAN-MAESTRO.md` §11 (branding) y la memoria del proyecto para el estado de
> implementación actual.

# FRIKIDEX — Especificación de identidad visual (v0.2)

## Concepto
App móvil (iOS/Android) de inventario para coleccionistas de juguetes y cómics.
Metáfora visual: un "dex" o escáner que identifica objetos. Tono: friki, divertido,
urbano, tipo letrero de tienda de cómics, sin verse infantil.
PROHIBIDO imitar la Pokédex: nada de rojo como color de marca, nada de Pokébolas,
nada de lentes circulares azules ni de la palabra "Poké".

## Colores base
- Violeta Frikidex  #6D4AFF  Color de marca: ícono, botones secundarios, tarjetas destacadas
- Lima escáner      #C6F432  Acento: CTA principal, el "DEX", brackets de escaneo, resaltados
- Noche             #16122B  Fondo principal (modo oscuro) y texto principal en modo claro. Sustituye al negro
- Papel cómic       #F5F0E6  Fondo claro y texto principal sobre oscuro. Sustituye al blanco
- Coral alerta      #FF6B57  SOLO funcional: badge "¡Ya lo tienes!", repetidos, errores y acciones destructivas

## Colores de apoyo (derivados)
- Noche profundo          #0F0C1F  Fondo detrás de las tarjetas, o fondo de escaneo/cámara
- Superficie tarjeta      #221C3D  Tarjetas sobre fondo Noche
- Superficie elevada      #2E2752  Placeholders de foto, inputs y elementos dentro de tarjetas
- Violeta hover/pressed    #4B2FD6
- Lima hover/pressed      #E2FF8A
- Fondo claro alterno     #EDE7DA
- Borde en modo claro     #D9D1C0
- Blanco puro             #FFFFFF  Solo tarjetas en modo claro y texto sobre violeta

## Texto
Sobre fondo oscuro (Noche):
- Principal   #F5F0E6
- Secundario  #CFC8E6
- Terciario   #A79FC4  (etiquetas, metadatos, placeholders)
- Sobre violeta: #FFFFFF para títulos, #F1ECFF para párrafos
Sobre fondo claro (Papel):
- Principal   #16122B
- Secundario  #3E3856
- Terciario   #5B5470

## Reglas de contraste
- Nunca poner texto lima sobre Papel o blanco (no se lee). El lima como texto solo va sobre Noche o Violeta.
- El texto encima de un fondo lima o coral SIEMPRE va en Noche #16122B.
- El texto encima de violeta va en blanco o Papel.

## Botones
- PRIMARIO (la acción principal de cada pantalla, ej. "ESCANEAR"):
  fondo #C6F432, texto #16122B, tipografía Bungee 17px en mayúsculas,
  alto 52px, radio 14px, sin borde. Hover/pressed #E2FF8A.
- SECUNDARIO:
  fondo #6D4AFF, texto #FFFFFF, Bungee 16–17px en mayúsculas, alto 52px, radio 14px.
  Hover/pressed #4B2FD6.
- TERCIARIO / GHOST:
  fondo transparente, borde de 2px en #C6F432 (sobre oscuro) o #6D4AFF (sobre claro),
  texto del mismo color que el borde, alto 48px, radio 14px.
- LINK / TEXTO:
  DM Sans 14–15px, peso 700, sin subrayado.
  #C6F432 sobre oscuro, #6D4AFF sobre claro. Puede llevar flecha "→".
- DESTRUCTIVO:
  fondo #FF6B57, texto #16122B, mismo tamaño que el primario.
- DESHABILITADO:
  fondo #2E2752, texto #A79FC4 (en oscuro); fondo #EDE7DA, texto #5B5470 (en claro).
- Solo UN botón primario lima por pantalla.

## Tipografía
1) Bungee (Google Fonts, licencia SIL OFL, uso comercial libre)
   - Es solo de MAYÚSCULAS. Se usa para: logotipo, títulos, botones, números de ficha (#042)
     y etiquetas cortas.
   - NUNCA para párrafos ni textos de más de una línea corta.
   - Tamaños de referencia en la app: título de pantalla 30px, sección 22px,
     botón 17px, número de ficha 13–15px.
2) DM Sans (Google Fonts), pesos 400, 500 y 700
   - Todo el texto de lectura: párrafos, descripciones, metadatos, formularios, badges.
   - Cuerpo 16px/1.4, título de tarjeta 19px/700, metadatos 14px, badge 13px/700,
     etiqueta en mayúsculas 12–14px/500 con letter-spacing 0.1em.

## Logotipo
- Wordmark: "FRIKIDEX" en Bungee; "FRIKI" en color base y "DEX" en color de acento.
  - Sobre oscuro: FRIKI #F5F0E6 + DEX #C6F432
  - Sobre claro:  FRIKI #16122B + DEX #6D4AFF
  - Monocromo: todo Noche o todo blanco
- Lockups: horizontal (ícono a la izquierda + wordmark) y vertical (ícono arriba + wordmark).
- Slogan de apoyo: "ESCANEA · IDENTIFICA · COLECCIONA" (DM Sans 500, mayúsculas, letter-spacing amplio).

## Ícono de app
- Cuadro violeta #6D4AFF, radio 28 sobre 120 (≈23%). Para las tiendas se entrega cuadrado, sin radio.
- Cuatro esquinas de visor/escáner en lima #C6F432: trazo de 7/120, puntas redondeadas.
- Al centro, una "F" en Bungee color #F5F0E6, convertida a trazos.
- Estrella de 4 puntas en lima a la derecha de la F (el "objeto especial").
- Versión monocroma: fondo Noche, todo lo demás blanco.
- Archivos ya generados por el usuario: frikidex-icono (.png/.svg), -cuadrado y -monocromo
  (pendiente que el usuario los entregue para colocarlos en `app/assets/`).

## Radios
- Tarjetas grandes: 24px · tarjetas internas o medianas: 20px · imágenes/thumbnails: 14px
- Botones e inputs: 14px · badges/pills: 999px (totalmente redondos)

## Espaciado
- Base de 4px. Padding de pantalla móvil: 20px laterales.
- Padding de tarjeta: 16–24px. Separación entre tarjetas: 16–20px.

## Fondos
- Modo oscuro por defecto: pantalla #16122B, tarjetas #221C3D, elementos internos #2E2752.
- Modo claro: pantalla #F5F0E6, tarjetas #FFFFFF, bordes #D9D1C0.
- Tarjeta héroe o destacada (ej. "¿YA LO TENGO?"): fondo violeta #6D4AFF con botón primario lima.
- No usar degradados. Colores planos siempre.

## Elementos gráficos de marca
- Brackets de escáner: las 4 esquinas del ícono reutilizadas en grande para enmarcar
  la cámara al escanear, placeholders de foto y piezas de redes sociales. Color lima, puntas redondeadas.
- Trama de puntos (estilo impresión de cómic): círculos de 3px de radio en una cuadrícula de 18px,
  color #6D4AFF al 55% de opacidad, recortada en formas circulares en esquinas de fondos oscuros.
  Solo decorativa: marketing, splash y estados vacíos.
- Destellos: estrellas de 4 puntas en lima o Papel, dispersas y en pocos puntos.

## Componentes clave
- Badge "¡Ya lo tienes!": fondo coral #FF6B57, texto Noche, DM Sans 13px/700, pill.
- Ficha de objeto: número "#042 · CATEGORÍA" en Bungee lima de 13px, nombre en DM Sans 19px/700,
  ubicación con flecha "Vitrina sala → Estante B" en DM Sans 14px color secundario.
- Placeholder de foto: fondo #2E2752, brackets lima al centro y etiqueta "FOTO" en 10px color terciario.
- Etiquetas de sección: DM Sans 500 en mayúsculas, letter-spacing 0.1em, color terciario.
