/**
 * Registro del service worker (RF-38, RF-40). Guarda toda la app en el dispositivo tras la primera
 * visita. Una versión nueva se descarga sola y espera a la próxima vez que se abra la app:
 * no se avisa al usuario ni se recarga lo que está leyendo.
 */
import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker(): void {
  registerSW({ immediate: true });
}
