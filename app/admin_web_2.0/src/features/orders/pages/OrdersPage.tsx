import { Plus, ShoppingCart } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { DataTablePlaceholder } from '../../../components/ui/DataTablePlaceholder'

export function OrdersPage() {
  return (
    <Card
      actions={
        <Button disabled title="Disponível após a integração com a API">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova encomenda
        </Button>
      }
      description="Acompanha o estado, o valor e o cliente de cada encomenda."
      title="Todas as encomendas"
    >
      <DataTablePlaceholder
        columns={[
          { label: 'Encomenda' },
          { label: 'Cliente' },
          { label: 'Estado' },
          { label: 'Total', align: 'right' },
          { label: 'Data', align: 'right' },
        ]}
        description="As encomendas registadas na loja serão apresentadas nesta tabela depois de ligares a API."
        icon={ShoppingCart}
        title="Ainda não existem encomendas"
      />
    </Card>
  )
}
