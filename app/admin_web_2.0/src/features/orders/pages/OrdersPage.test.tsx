import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AdminOrder } from '../../admin/adminApi'
import { OrderDetails } from './OrdersPage'

describe('OrderDetails', () => {
  it('renders the complete order details and keeps available status actions', () => {
    const order: AdminOrder = {
      id: 42,
      userId: 7,
      status: 'pending',
      paymentStatus: 'paid',
      deliveryMethod: 'home_delivery',
      total: 1300,
      subtotal: 1250,
      discount: 100,
      deliveryFee: 150,
      notes: 'Entregar à tarde',
      rejectionReason: null,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      address: {
        id: 3,
        label: 'Casa',
        province: 'Maputo',
        city: 'Matola',
        neighborhood: 'Liberdade',
        street: 'Rua 1',
        number: '12',
        reference: 'Portão azul',
        geoLat: null,
        geoLng: null,
        isDefault: true,
      },
      paymentMethod: {
        id: 2,
        type: 'mpesa',
        label: null,
        provider: 'M-Pesa',
        cardBrand: null,
        cardLast4: null,
        phone: '+258841234567',
      },
      couponCode: 'NOVO10',
      acceptedAt: null,
      rejectedAt: null,
      completedAt: null,
      cancelledAt: null,
      customer: {
        id: 7,
        name: 'Ana Cliente',
        email: 'ana@example.com',
        phone: '+258841234567',
        avatarUrl: null,
      },
      items: [
        {
          id: 11,
          productId: 9,
          quantity: 2,
          unitPrice: 625,
          subtotal: 1250,
          product: { id: 9, name: 'Produto real', image: null },
        },
      ],
    }

    const markup = renderToStaticMarkup(
      createElement(OrderDetails, {
        order,
        busy: false,
        currency: new Intl.NumberFormat('pt-MZ', {
          style: 'currency',
          currency: 'MZN',
        }),
        onAccept: () => undefined,
        onReject: () => undefined,
        onStatusChange: () => undefined,
      }),
    )

    for (const value of [
      'Ana Cliente',
      'ana@example.com',
      'Produto real',
      'Morada de entrega',
      'Rua 1, 12',
      'Portão azul',
      'Método de pagamento',
      '+258841234567',
      'NOVO10',
      'Subtotal',
      'Desconto',
      'Taxa de entrega',
      'Total',
      'Aceitar encomenda',
      'Rejeitar',
    ]) {
      expect(markup).toContain(value)
    }
  })

  it('does not render optional delivery or payment sections when the API returns null', () => {
    const order: AdminOrder = {
      id: 43,
      userId: 8,
      status: 'pending',
      paymentStatus: 'pending',
      deliveryMethod: 'store_pickup',
      total: 0,
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      notes: null,
      rejectionReason: null,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      address: null,
      paymentMethod: null,
      couponCode: null,
      acceptedAt: null,
      rejectedAt: null,
      completedAt: null,
      cancelledAt: null,
      items: [],
    }

    const markup = renderToStaticMarkup(
      createElement(OrderDetails, {
        order,
        busy: false,
        currency: new Intl.NumberFormat('pt-MZ', {
          style: 'currency',
          currency: 'MZN',
        }),
        onAccept: () => undefined,
        onReject: () => undefined,
        onStatusChange: () => undefined,
      }),
    )

    expect(markup).not.toContain('Morada de entrega')
    expect(markup).not.toContain('Método de pagamento</h3>')
    expect(markup).not.toContain('NOVO10')
  })
})
