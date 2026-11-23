import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CircleAlert, Headset, LoaderCircle, Send, UserRound } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../../lib/api/errors'
import { useAuth } from '../../auth/context/useAuth'
import {
  adminApi,
  type SupportConversation,
  type SupportConversationDetails,
} from '../../admin/adminApi'

const conversationsKey = ['support', 'conversations']
const conversationKey = (id: number) => ['support', 'conversation', id]

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function SupportInboxPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const messageEndRef = useRef<HTMLDivElement>(null)
  const conversations = useQuery({
    queryKey: conversationsKey,
    queryFn: adminApi.listSupportConversations,
    refetchInterval: 5000,
  })
  const selectedId = conversations.data?.some(item => item.id === selectedConversationId)
    ? selectedConversationId
    : conversations.data?.[0]?.id ?? null
  const conversation = useQuery({
    queryKey: selectedId ? conversationKey(selectedId) : ['support', 'conversation', 'none'],
    queryFn: () => adminApi.getSupportConversation(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: selectedId === null ? false : 5000,
  })
  const selected = conversation.data?.conversation
  const canReply = Boolean(
    selected &&
    selected.status === 'active' &&
    selected.assigned_support_id === user?.id,
  )
  const canClose = Boolean(
    selected &&
    (canReply || (user?.role === 'admin' && selected.status !== 'closed')),
  )

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.data?.messages.length])

  const claim = useMutation({
    mutationFn: (id: number) => adminApi.claimSupportConversation(id),
    onSuccess: async result => {
      queryClient.setQueryData<SupportConversationDetails>(
        conversationKey(result.conversation.id),
        result,
      )
      await queryClient.invalidateQueries({ queryKey: conversationsKey })
    },
  })

  const send = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) =>
      adminApi.sendSupportMessage(id, body),
    onSuccess: async result => {
      setMessage('')
      queryClient.setQueryData<SupportConversationDetails>(
        conversationKey(result.conversation.id),
        result,
      )
      await queryClient.invalidateQueries({ queryKey: conversationsKey })
    },
  })

  const close = useMutation({
    mutationFn: (id: number) => adminApi.closeSupportConversation(id),
    onSuccess: async result => {
      queryClient.setQueryData<SupportConversationDetails>(
        conversationKey(result.conversation.id),
        result,
      )
      const remaining = (
        queryClient.getQueryData<SupportConversation[]>(conversationsKey) ?? []
      ).filter(item => item.id !== result.conversation.id)
      queryClient.setQueryData(conversationsKey, remaining)
      setSelectedConversationId(remaining[0]?.id ?? null)
      await queryClient.invalidateQueries({ queryKey: conversationsKey })
    },
  })

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = message.trim()
    if (!selectedId || !body || !canReply || send.isPending) return
    send.mutate({ id: selectedId, body })
  }

  const error = conversations.error
    ?? conversation.error
    ?? claim.error
    ?? send.error
    ?? close.error

  return (
    <div className="space-y-6">
      <Card
        description="Atende as conversas que os clientes encaminharam para a equipa."
        title="Assistência ao cliente"
      >
        {(conversations.isError || conversation.isError || claim.isError || send.isError || close.isError) && (
          <p
            className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger"
            role="alert"
          >
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {getApiErrorMessage(error)}
          </p>
        )}

        <div className="grid min-h-[65vh] overflow-hidden rounded-xl border border-line lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-line lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Conversas</h2>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">
                {conversations.data?.length ?? 0}
              </span>
            </div>
            <div className="max-h-[34vh] overflow-y-auto lg:max-h-[65vh]">
              {conversations.isLoading ? (
                <p className="p-4 text-sm text-muted">A carregar conversas...</p>
              ) : conversations.data?.length ? (
                conversations.data.map(item => (
                  <button
                    aria-current={selectedId === item.id ? 'true' : undefined}
                    className={`block w-full border-b border-line px-4 py-3 text-left transition hover:bg-canvas ${
                      selectedId === item.id ? 'bg-brand-50' : 'bg-white'
                    }`}
                    key={item.id}
                    onClick={() => setSelectedConversationId(item.id)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">
                        {item.customer_name}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.status === 'waiting'
                          ? 'bg-warning-surface text-warning'
                          : 'bg-success-surface text-success'
                      }`}>
                        {item.status === 'waiting' ? 'À espera' : 'Em atendimento'}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">{item.customer_phone}</span>
                    <span className="mt-2 block truncate text-xs text-muted">
                      {item.last_message ?? 'Sem mensagens'}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted">
                      {formatTime(item.last_message_at)}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState
                  description="As conversas encaminhadas pelos clientes aparecem aqui."
                  icon={Headset}
                  title="Sem conversas pendentes"
                />
              )}
            </div>
          </aside>

          <section aria-label="Conversa seleccionada" className="flex min-h-[50vh] flex-col bg-white lg:min-h-0">
            {!selectedId ? (
              <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted">
                Escolhe uma conversa para começar o atendimento.
              </div>
            ) : conversation.isLoading ? (
              <div className="grid flex-1 place-items-center p-8 text-sm text-muted">
                <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              </div>
            ) : selected ? (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-ink">
                      {selected.customer_name}
                    </h2>
                    <p className="text-xs text-muted">
                      {selected.customer_phone}
                      {selected.assigned_support_name
                        ? ` · Atendimento: ${selected.assigned_support_name}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selected.status === 'waiting' && (
                      <Button
                        disabled={claim.isPending}
                        onClick={() => claim.mutate(selected.id)}
                        variant="primary"
                      >
                        {claim.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Assumir conversa
                      </Button>
                    )}
                    {canClose && (
                      <Button
                        disabled={close.isPending}
                        onClick={() => close.mutate(selected.id)}
                        variant="secondary"
                      >
                        Encerrar
                      </Button>
                    )}
                  </div>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
                  {conversation.data?.messages.map(item => {
                    const isOwnMessage = item.sender_type === 'support'
                      && item.sender_user_id === user?.id
                    const sender = item.sender_type === 'bot'
                      ? 'Robô'
                      : item.sender_type === 'customer'
                        ? selected.customer_name
                        : isOwnMessage ? 'Você' : 'Assistente'
                    return (
                      <article
                        className={`max-w-[88%] rounded-2xl border border-line p-3 ${
                          item.sender_type === 'support'
                            ? 'ml-auto bg-brand-50'
                            : 'bg-canvas'
                        }`}
                        key={item.id}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                          {item.sender_type === 'customer'
                            ? <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
                            : <Headset aria-hidden="true" className="h-3.5 w-3.5" />}
                          <strong>{sender}</strong>
                          <time className="ml-auto">{formatTime(item.created_at)}</time>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm text-ink">{item.body}</p>
                      </article>
                    )
                  })}
                  <div ref={messageEndRef} />
                </div>

                {selected.status === 'active' && !canReply && (
                  <p className="border-t border-line px-4 py-3 text-sm text-muted">
                    {selected.assigned_support_name
                      ? `Esta conversa está a ser atendida por ${selected.assigned_support_name}.`
                      : 'Assume esta conversa para começar a responder.'}
                  </p>
                )}

                {canReply && (
                  <form className="flex gap-2 border-t border-line p-3" onSubmit={submitMessage}>
                    <textarea
                      aria-label="Mensagem para o cliente"
                      className="min-h-11 flex-1 resize-y rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-end/10"
                      maxLength={2000}
                      onChange={event => setMessage(event.target.value)}
                      placeholder="Escreve uma resposta..."
                      rows={2}
                      value={message}
                    />
                    <Button disabled={!message.trim() || send.isPending} type="submit" variant="primary">
                      {send.isPending
                        ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                        : <Send aria-hidden="true" className="h-4 w-4" />}
                      Enviar
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-sm text-muted">
                A conversa já não está disponível.
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  )
}
