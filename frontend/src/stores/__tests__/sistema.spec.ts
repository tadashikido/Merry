import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useSistemaStore } from '@/stores/sistema'
import { MENSAGEM_FALHA_CONEXAO } from '@/textos/mensagens'

vi.mock('@/servicos/clienteHttp', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/servicos/clienteHttp')>()
  return { ...original, requisitar: vi.fn() }
})

const requisitarSimulado = vi.mocked(requisitar)

describe('useSistemaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requisitarSimulado.mockReset()
  })

  it('[UNITÁRIO] inicia sem informações e sem erro', () => {
    const store = useSistemaStore()

    expect(store.informacoes).toBeNull()
    expect(store.erro).toBeNull()
    expect(store.carregando).toBe(false)
  })

  it('[UNITÁRIO] trata o estado inicial como carregando para não exibir erro antes da primeira consulta', () => {
    const store = useSistemaStore()

    expect(store.situacao).toBe('carregando')
  })

  it('[UNITÁRIO] carrega as informações do sistema pelo endpoint correto', async () => {
    requisitarSimulado.mockResolvedValue({ nome: 'Casamento', versao: '0.1.0' })
    const store = useSistemaStore()

    await store.carregarInformacoes()

    expect(requisitarSimulado).toHaveBeenCalledWith('/api/sistema/informacoes')
    expect(store.informacoes).toEqual({ nome: 'Casamento', versao: '0.1.0' })
    expect(store.situacao).toBe('conectado')
    expect(store.carregando).toBe(false)
  })

  it('[UNITÁRIO] expõe situação carregando enquanto a requisição está pendente', async () => {
    let resolver: (valor: { nome: string; versao: string }) => void = () => undefined
    requisitarSimulado.mockReturnValue(new Promise((r) => (resolver = r)))
    const store = useSistemaStore()

    const carregamento = store.carregarInformacoes()

    expect(store.carregando).toBe(true)
    expect(store.situacao).toBe('carregando')
    resolver({ nome: 'Casamento', versao: '0.1.0' })
    await carregamento
    expect(store.situacao).toBe('conectado')
  })

  it('[UNITÁRIO] registra a mensagem do ErroApi em caso de falha da API', async () => {
    requisitarSimulado.mockRejectedValue(new ErroApi('Ocorreu um erro inesperado.', 500, null))
    const store = useSistemaStore()

    await store.carregarInformacoes()

    expect(store.erro).toBe('Ocorreu um erro inesperado.')
    expect(store.informacoes).toBeNull()
    expect(store.situacao).toBe('erro')
  })

  it('[UNITÁRIO] usa mensagem padrão para falhas desconhecidas', async () => {
    requisitarSimulado.mockRejectedValue(new Error('qualquer'))
    const store = useSistemaStore()

    await store.carregarInformacoes()

    expect(store.erro).toBe(MENSAGEM_FALHA_CONEXAO)
  })

  it('[UNITÁRIO] sinaliza offline quando o navegador está sem rede', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    requisitarSimulado.mockRejectedValue(new ErroApi(MENSAGEM_FALHA_CONEXAO, 0, null))
    const store = useSistemaStore()

    await store.carregarInformacoes()

    expect(store.offline).toBe(true)
  })

  it('[UNITÁRIO] limpa erro anterior ao tentar novamente com sucesso', async () => {
    requisitarSimulado.mockRejectedValueOnce(new ErroApi(MENSAGEM_FALHA_CONEXAO, 0, null))
    requisitarSimulado.mockResolvedValueOnce({ nome: 'Casamento', versao: '0.1.0' })
    const store = useSistemaStore()

    await store.carregarInformacoes()
    await store.carregarInformacoes()

    expect(store.erro).toBeNull()
    expect(store.offline).toBe(false)
    expect(store.situacao).toBe('conectado')
  })
})
