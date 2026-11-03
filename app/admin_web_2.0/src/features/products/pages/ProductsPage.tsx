import { Package, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { DataTablePlaceholder } from '../../../components/ui/DataTablePlaceholder'

export function ProductsPage() {
  return (
    <Card
      actions={
        <Button disabled title="Disponível após a integração com a API">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Adicionar produto
        </Button>
      }
      description="Consulta e organiza os produtos, o stock e a disponibilidade do catálogo."
      title="Catálogo de produtos"
    >
      <DataTablePlaceholder
        columns={[
          { label: 'Produto' },
          { label: 'Categoria' },
          { label: 'Preço', align: 'right' },
          { label: 'Stock', align: 'right' },
          { label: 'Estado', align: 'right' },
        ]}
        description="Os produtos do catálogo serão listados aqui quando o módulo estiver ligado à API."
        icon={Package}
        title="Ainda não existem produtos"
      />
    </Card>
  )
}
