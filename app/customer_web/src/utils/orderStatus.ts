// Ajuste as chaves aos valores reais de order.status devolvidos pelo backend.
const MAP: Record<string, [string, string]> = {
  pending: ['Recebida', 'warn'],
  accepted: ['Aceite', 'info'],
  rejected: ['Rejeitada', 'bad'],
  preparing: ['Em preparação', 'info'],
  ready_for_pickup: ['Pronta para levantamento', 'info'],
  out_for_delivery: ['Em entrega', 'info'],
  completed: ['Concluída', 'ok'],
  cancelled: ['Cancelada', 'bad'],
  canceled: ['Cancelada', 'bad'],
};

export function orderStatus(status: unknown): { label: string; tone: string } {
  const entry = MAP[String(status ?? '').toLowerCase()];
  return entry ? { label: entry[0], tone: entry[1] } : { label: String(status ?? '—'), tone: '' };
}