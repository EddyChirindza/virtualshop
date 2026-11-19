export type SupportConversationStatus = 'bot' | 'waiting' | 'active' | 'closed'
export type SupportMessageSender = 'customer' | 'bot' | 'support'

export interface SupportConversation {
  id: number
  status: SupportConversationStatus
  assigned_support_id: number | null
  assigned_support_name: string | null
  created_at: string
  updated_at: string
  last_message_at: string
}

export interface SupportMessage {
  id: number
  conversation_id: number
  sender_type: SupportMessageSender
  sender_user_id: number | null
  body: string
  handoff_available: boolean
  created_at: string
}

export interface SupportConversationData {
  conversation: SupportConversation | null
  messages: SupportMessage[]
}
