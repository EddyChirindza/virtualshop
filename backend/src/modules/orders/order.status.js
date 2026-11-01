const ORDER_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
  'cancelled',
];

const DELIVERY_METHODS = ['home_delivery', 'store_pickup'];

const TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
  ready_for_pickup: ['completed'],
  out_for_delivery: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

function allowedTransitions(status, deliveryMethod) {
  const transitions = TRANSITIONS[status] || [];
  return transitions.filter((next) => {
    if (next === 'ready_for_pickup') return deliveryMethod === 'store_pickup';
    if (next === 'out_for_delivery') return deliveryMethod === 'home_delivery';
    return true;
  });
}

function isTransitionAllowed(status, nextStatus, deliveryMethod) {
  return allowedTransitions(status, deliveryMethod).includes(nextStatus);
}

function statusNotification(orderId, status, reason = null) {
  const number = `#${orderId}`;
  switch (status) {
    case 'accepted':
      return {
        title: 'Pedido aceite!',
        message: `O teu pedido ${number} foi aceite e está a ser processado.`,
      };
    case 'rejected':
      return {
        title: 'Pedido rejeitado.',
        message: `O teu pedido ${number} foi rejeitado. Motivo: ${reason || 'não indicado'}.`,
      };
    case 'preparing':
      return {
        title: 'Pedido em preparação.',
        message: `O teu pedido ${number} está a ser preparado.`,
      };
    case 'ready_for_pickup':
      return {
        title: 'Pedido pronto para levantamento.',
        message: `O teu pedido ${number} está pronto para ser levantado na loja.`,
      };
    case 'out_for_delivery':
      return {
        title: 'Pedido em entrega.',
        message: `O teu pedido ${number} foi encaminhado para entrega ao domicílio.`,
      };
    case 'completed':
      return {
        title: 'Pedido concluído.',
        message: `O teu pedido ${number} foi concluído.`,
      };
    case 'cancelled':
      return {
        title: 'Pedido cancelado.',
        message: `O teu pedido ${number} foi cancelado.`,
      };
    default:
      return null;
  }
}

module.exports = {
  ORDER_STATUSES,
  DELIVERY_METHODS,
  allowedTransitions,
  isTransitionAllowed,
  statusNotification,
};
