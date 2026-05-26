export const WHATSAPP_NUMBER = "573187164579";

/** URL base de WhatsApp sin mensaje (para soporte/contacto genérico) */
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/** URL con mensaje predeterminado para landing/interés general */
export const WHATSAPP_URL_LANDING = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hola! Estoy interesado en conocer más sobre Abakosoft para mi empresa. ¿Podemos hablar?",
)}`;

/** URL con mensaje para consultar sobre planes/módulos adicionales */
export const WHATSAPP_URL_PLAN = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hola, quiero consultar sobre el acceso a módulos adicionales en mi plan.",
)}`;

/**
 * Genera un enlace de WhatsApp con un mensaje personalizado.
 * @param {string} mensaje - Texto del mensaje a enviar
 * @returns {string} URL completa de WhatsApp
 */
export const whatsappLink = (mensaje) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
