import { Plus, Tags } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'

export function CategoriesPage() {
  return (
    <Card
      actions={
        <Button disabled title="Disponível após a integração com a API">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova categoria
        </Button>
      }
      description="Organiza as categorias que estruturam o catálogo da loja."
      title="Categorias do catálogo"
    >
      <EmptyState
        description="As categorias serão apresentadas aqui, com o respectivo número de produtos associados, quando o módulo estiver ligado à API."
        icon={Tags}
        title="Ainda não existem categorias"
      />
    </Card>
  )
}
