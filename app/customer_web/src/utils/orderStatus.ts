// Ajuste as chaves aos valores reais de order.status devolvidos pelo backend.
const MAP: Record<string, [string, string]> = {
  pending: ['Recebida', 'warn'],
  paid: ['Paga', 'info'],
  processing: ['Em preparação', 'info'],
  shipped: ['Em transporte', 'info'],
  delivered: ['Entregue', 'ok'],
  cancelled: ['Cancelada', 'bad'],
  canceled: ['Cancelada', 'bad'],
};

export function orderStatus(status: unknown): { label: string; tone: string } {
  const entry = MAP[String(status ?? '').toLowerCase()];
  return entry ? { label: entry[0], tone: entry[1] } : { label: String(status ?? '—'), tone: '' };
}