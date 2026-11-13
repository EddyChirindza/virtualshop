import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Customer } from '../../admin/adminApi'
import { CustomerDetailsDialog } from './CustomersPage'

describe('CustomerDetailsDialog', () => {
  it('renders customer data and photo from the existing list response', () => {
    const customer: Customer = {
      id: 25,
      fullName: 'Maria Exemplo',
      email: 'maria@example.com',
      phone: '+258841234567',
      avatarUrl: 'https://images.example.test/customer.jpg',
      createdAt: '2026-10-25T09:30:00.000Z',
    }

    const markup = renderToStaticMarkup(
      createElement(CustomerDetailsDialog, {
        customer,
        onClose: () => undefined,
      }),
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('Maria Exemplo')
    expect(markup).toContain('maria@example.com')
    expect(markup).toContain('+258841234567')
    expect(markup).toContain('Fotografia de Maria Exemplo')
    expect(markup).toContain('https://images.example.test/customer.jpg')
    expect(markup).toContain('Registado em')
  })

  it('shows safe fallbacks when customer fields are missing', () => {
    const customer: Customer = {
      id: 26,
      fullName: '',
      email: null,
      phone: '',
      avatarUrl: null,
      createdAt: 'invalid-date',
    }

    const markup = renderToStaticMarkup(
      createElement(CustomerDetailsDialog, {
        customer,
        onClose: () => undefined,
      }),
    )

    expect(markup).toContain('Sem nome')
    expect(markup).toContain('Cliente #26')
    expect(markup.match(/—/g)).toHaveLength(3)
  })
})
