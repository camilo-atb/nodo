/**
 * Configuración del SDK de Portal.
 * La instancia se crea UNA VEZ a nivel de módulo (síncrono y pasivo).
 * El token se obtiene bajo demanda vía callback async.
 */

// TODO: descomentar cuando @portalsdk/core esté instalado
// import { Portal } from '@portalsdk/core';
//
// export const portal = new Portal({
//   apiKey: import.meta.env.VITE_PORTAL_PUBLIC_KEY,
// });

export const PORTAL_PUBLIC_KEY = import.meta.env.VITE_PORTAL_PUBLIC_KEY;
