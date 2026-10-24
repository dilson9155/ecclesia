"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Em desenvolvimento os chunks do Next mudam sem trocar de URL; um cache
    // antigo do service worker serviria bundles desatualizados e quebraria a
    // hidratação. O PWA é habilitado apenas no build de produção.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .then(() => {
          if (!("caches" in window)) return;
          return caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys
                  .filter((key) => key.startsWith("ecclesia-"))
                  .map((key) => caches.delete(key))
              )
            );
        })
        .catch(() => undefined);
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // O app continua funcionando normalmente, mesmo sem suporte offline.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
