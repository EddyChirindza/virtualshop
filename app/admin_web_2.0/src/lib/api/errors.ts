import axios from 'axios'

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      return data.message
    }
    if (error.code === 'ECONNABORTED') {
      return 'O pedido demorou demasiado tempo. Tenta novamente.'
    }
    if (!error.response) {
      return 'Não foi possível contactar o servidor. Verifica a ligação.'
    }
  }

  if (error instanceof Error) return error.message
  return 'Ocorreu um erro inesperado.'
}
