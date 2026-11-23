/**
 * Navegación dentro de la app sin recargar la página (RF-7, RF-8).
 * Fuera de un proveedor (p. ej. la tarjeta mostrada sola), los enlaces son enlaces normales.
 */
import { createContext, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";

export type Navigate = (path: string, options?: { replace?: boolean }) => void;

export const NavigationContext = createContext<Navigate | null>(null);

interface LinkProps {
  href: string;
  class?: string;
  children: ComponentChildren;
}

/** Enlace que navega dentro de la app; con Ctrl, Mayús, rueda, etc., el navegador actúa como siempre. */
export function Link({ href, class: className, children }: LinkProps) {
  const navigate = useContext(NavigationContext);
  const onClick = (event: MouseEvent) => {
    if (!navigate || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} class={className} onClick={onClick}>
      {children}
    </a>
  );
}
