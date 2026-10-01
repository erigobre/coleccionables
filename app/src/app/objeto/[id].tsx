// Reexporta la misma pantalla de detalle de (tabs)/objetos/[id], pero como
// hermana de (tabs) en el stack raíz. Se usa cuando se llega al detalle desde
// otra pantalla que también vive fuera de los tabs (ej. ya-lo-tengo.tsx), para
// que el "atrás" no cruce de navegador y conserve ese historial en vez de caer
// en Objetos.
export { default } from '../(tabs)/objetos/[id]/index';
