import { useState } from "react";

/**
 * Genera un UUID estable por montaje del componente.
 * Usar en formularios de creación: enviar como header X-Idempotency-Key en el POST.
 *
 * Ejemplo:
 *   const idempotencyKey = useIdempotencyKey();
 *   await api.post("/endpoint", data, { headers: { "X-Idempotency-Key": idempotencyKey } });
 */
export function useIdempotencyKey() {
  const [key] = useState(() => crypto.randomUUID());
  return key;
}
