import { validateEvent } from './domain.mjs?v=4b7fdc914fc1';

export class DeliveryError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}
export function validateWebhookUrl(value) {
  if (!value) throw new DeliveryError('Os envios ainda não estão disponíveis. Tente novamente quando o atendimento estiver conectado.', 'NOT_CONFIGURED');
  let url;
  try { url = new URL(value); } catch { throw new DeliveryError('URL de atendimento inválida.', 'INVALID_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || !/\/webhook(?:-test)?\/[\w/-]+\/?$/.test(url.pathname) || url.search || url.hash) {
    throw new DeliveryError('Configure a URL do nó Webhook, não a página de workflows.', 'INVALID_URL');
  }
  return url.href;
}
export function createN8nService(config, fetcher = globalThis.fetch) {
  const inFlight = new Set();
  return {
    async send(event) {
      const payload = validateEvent(event);
      const url = validateWebhookUrl(config.webhookUrl);
      if (inFlight.has(event.eventId)) throw new DeliveryError('Este pedido já está sendo enviado.', 'IN_FLIGHT');
      inFlight.add(event.eventId);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs || 25000);
      try {
        const response = await fetcher(url, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
        if (!response.ok) throw new DeliveryError('O atendimento não confirmou o envio. Seus dados continuam no formulário; tente novamente mais tarde com o mesmo protocolo.', 'HTTP_ERROR');
        let receipt;
        try { receipt = await response.json(); } catch { throw new DeliveryError('Resposta inesperada. Não foi possível confirmar o recebimento.', 'INVALID_RECEIPT'); }
        if (receipt.ok !== true || receipt.delivered !== true || receipt.eventId !== event.eventId) throw new DeliveryError('Não foi possível confirmar a entrega ao atendimento.', 'INVALID_RECEIPT');
        return receipt;
      } catch (error) {
        if (error instanceof DeliveryError) throw error;
        throw new DeliveryError('Não foi possível confirmar o envio. Verifique sua conexão. O pedido pode ter chegado; uma nova tentativa usará o mesmo protocolo.', error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
      } finally {
        clearTimeout(timer);
        inFlight.delete(event.eventId);
      }
    }
  };
}
