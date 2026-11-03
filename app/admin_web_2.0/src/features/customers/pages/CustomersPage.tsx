import { Users } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { DataTablePlaceholder } from '../../../components/ui/DataTablePlaceholder'

export function CustomersPage() {
  return (
    <Card
      description="Consulta os clientes registados e o histórico de actividade na loja."
      title="Clientes registados"
    >
      <DataTablePlaceholder
        columns={[
          { label: 'Cliente' },
          { label: 'Contacto' },
          { label: 'Encomendas', align: 'right' },
          { label: 'Registo', align: 'right' },
        ]}
        description="A lista de clientes será apresentada aqui depois de ligares o painel à API."
        icon={Users}
        title="Ainda não existem clientes"
      />
    </Card>
  )
}
