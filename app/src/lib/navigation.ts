import type { ImperativeRouter } from 'expo-router';

// Saltar directo a una pantalla del stack anidado de "objetos" desde OTRO tab
// (Home, Wishlist) deja ese stack sin "index" debajo en su historial: el botón
// atrás no tiene a dónde volver y termina mandando a Home, y el stack se queda
// "pegado" en esa pantalla la próxima vez que se entra al tab Objetos. Empujar
// primero el index del tab arma el historial correcto antes de entrar.
export function openObjetosScreen(router: ImperativeRouter, screen: 'captura' | 'ya-lo-tengo'): void {
  router.push('/(tabs)/objetos');
  router.push(`/(tabs)/objetos/${screen}`);
}
