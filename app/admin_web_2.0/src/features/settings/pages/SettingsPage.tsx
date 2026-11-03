import { Bell, ShieldCheck, Store } from 'lucide-react'
import { Card } from '../../../components/ui/Card'

const inputClassName =
  'w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-70'

const labelClassName = 'text-xs font-semibold text-ink'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-surface px-2.5 py-1 text-[11px] font-semibold text-warning">
            Integração pendente
          </span>
        }
        description="Informação principal da loja apresentada no painel e nas comunicações."
        title="Informação da loja"
      >
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled>
          <legend className="sr-only">Informação da loja</legend>
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="store-name">
              Nome da loja
            </label>
            <input
              className={`${inputClassName} mt-1.5`}
              id="store-name"
              placeholder="VirtualShop"
              type="text"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="store-email">
              Email de contacto
            </label>
            <input
              className={`${inputClassName} mt-1.5`}
              id="store-email"
              placeholder="support@virtualshop.co.mz"
              type="email"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="store-phone">
              Telefone de contacto
            </label>
            <input
              className={`${inputClassName} mt-1.5`}
              id="store-phone"
              placeholder="+258 84 000 0000"
              type="tel"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="store-currency">
              Moeda
            </label>
            <select className={`${inputClassName} mt-1.5`} id="store-currency">
              <option>MZN</option>
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="store-timezone">
              Fuso horário
            </label>
            <select className={`${inputClassName} mt-1.5`} id="store-timezone">
              <option>Africa/Maputo</option>
            </select>
          </div>
        </fieldset>
        <p className="mt-4 rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-muted">
          Estes campos serão editáveis quando o endpoint de configurações da
          loja estiver disponível.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          description="Canais e eventos em que a equipa administrativa é notificada."
          title="Notificações"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-line p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-end">
                <Bell aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">
                  Alertas de encomendas
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  Notificações de novas encomendas e alterações de estado.
                </p>
              </div>
            </div>
            <p className="text-xs leading-5 text-muted">
              As preferências de notificação serão configuráveis numa fase
              posterior.
            </p>
          </div>
        </Card>

        <Card
          description="Controlos de acesso e protecção da conta administrativa."
          title="Segurança"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-line p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-end">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">
                  Sessão administrativa
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  A autenticação e a renovação de sessão são geridas pelo
                  serviço existente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-end">
                <Store aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">
                  Permissões de equipa
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  A gestão de permissões ficará disponível no módulo de
                  administradores.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
