import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_FORNECEDOR, ID_FORNECEDOR_2, fornecedorCompleto, resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import router from '@/router'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_COBERTURA_FORNECEDORES, TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import type { TipoEvento } from '@/tipos/eventos'
import { RaizRotas, chamadas, quando, resumoEvento, rotearFetch } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('fornecedores', 'fornecedor-novo', 'fornecedor', 'fornecedor-editar')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA = '/api/fornecedores'
const ROTA_FORNECEDOR = `${ROTA}/${ID_FORNECEDOR}`
const ROTA_EVENTOS_ATIVOS = '/api/eventos?situacao=Ativos'

function carteira(...tipos: TipoEvento[]) {
  return tipos.map((tipo, indice) => resumoEvento({ id: `evento-${indice}`, tipo, diasRestantes: 10 + indice }))
}

const LISTA = [
  resumoFornecedor(),
  resumoFornecedor({ id: ID_FORNECEDOR_2, nomeEmpresa: 'Fotografia Ângela Lima', responsavel: 'Ângela', categoria: 'Fotografia', telefone: null, site: null, instagram: null }),
  resumoFornecedor({ id: 'arq', nomeEmpresa: 'Florista Jardim', categoria: 'Decoracao', arquivado: true }),
]

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
  fetchSimulado = simularFetch()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
})

async function abrir(caminho: string, telaPequena = false) {
  simularMatchMedia(telaPequena)
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

function nomesVisiveis(alvo: VueWrapper): string[] {
  return alvo.findAll('[data-teste="link-fornecedor"]').map((link) => link.text())
}

describe('FornecedoresView', () => {
  it('[COMPONENTE] agrupa ativos por categoria, mostra o índice e o item Fornecedores ativo no rail', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson(LISTA)))

    const { wrapper } = await abrir('/fornecedores')

    expect(wrapper.get('h1').text()).toBe(TEXTOS_FORNECEDORES.titulo)
    expect(wrapper.findAll('[data-teste="grupo-categoria"] h2').map((titulo) => titulo.text())).toEqual([
      'Buffet 1 fornecedor',
      'Fotografia 1 fornecedor',
    ])
    expect(nomesVisiveis(wrapper)).toEqual(['Buffet São João', 'Fotografia Ângela Lima'])
    expect(wrapper.get('[data-teste="indice-todas"]').attributes('aria-label')).toBe('Todas, 2 fornecedores')
    expect(wrapper.get('[data-teste="filtro-situacao"]').text()).toContain('Ativos 2')
    expect(wrapper.get('[data-teste="filtro-situacao"]').text()).toContain('Arquivados 1')
    expect(wrapper.get('[data-teste="link-fornecedor"]').attributes('href')).toBe(`/fornecedores/${ID_FORNECEDOR}`)
    const rail = wrapper.findAll('[data-teste="item-menu"]').find((item) => item.text() === 'Fornecedores')!
    expect(rail.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] busca sem acento, filtra pelo índice e anuncia o resultado', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson(LISTA)))
    const { wrapper } = await abrir('/fornecedores')

    await wrapper.get('[data-teste="busca-fornecedores"]').setValue('angela')
    expect(nomesVisiveis(wrapper)).toEqual(['Fotografia Ângela Lima'])
    expect(wrapper.get('[data-teste="anuncio-resultados"]').text()).toBe('1 fornecedor encontrado')

    await wrapper.get('[data-teste="busca-fornecedores"]').setValue('')
    await wrapper.get('[data-chave="Buffet"]').trigger('click')
    expect(nomesVisiveis(wrapper)).toEqual(['Buffet São João'])

    await wrapper.get('[data-teste="busca-fornecedores"]').setValue('inexistente')
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.semResultado)
    await wrapper.get('[data-teste="limpar-filtros"]').trigger('click')
    expect(nomesVisiveis(wrapper)).toHaveLength(2)
  })

  it('[COMPONENTE] no celular troca o índice pelo seletor de categoria', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson(LISTA)))

    const { wrapper } = await abrir('/fornecedores', true)

    expect(wrapper.find('[data-teste="indice-categorias"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="seletor-categoria"]').exists()).toBe(true)
    expect(wrapper.get('[data-teste="seletor-categoria"]').text()).toContain(`${TEXTOS_FORNECEDORES.todas} (2)`)
  })

  it('[COMPONENTE] sem fornecedores mostra o estado vazio do canvas com uma só ação primária', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson([])))

    const { wrapper, montagem } = await abrir('/fornecedores')

    expect(wrapper.text()).toContain('Você ainda não possui fornecedores.')
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    await wrapper.get('[data-teste="adicionar-fornecedor-vazio"]').trigger('click')
    await aguardarRota(montagem.roteador, 'fornecedor-novo')
  })

  it('[COMPONENTE] erro de rede permite tentar de novo e 403 mostra sem permissão', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaProblema(500, { title: 'Erro' })))
    const primeira = await abrir('/fornecedores')
    expect(primeira.wrapper.text()).toContain(TEXTOS_FORNECEDORES.erroTitulo)
    primeira.wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaProblema(403, { title: 'Proibido' })))
    const segunda = await abrir('/fornecedores')
    expect(segunda.wrapper.text()).toContain(TEXTOS_FORNECEDORES.semAcesso)
  })

  it('[COMPONENTE] arquivar tira dos ativos e oferece desfazer que restaura', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA, () => respostaJson(LISTA)),
      quando('POST', `${ROTA_FORNECEDOR}/arquivar`, () => respostaJson(fornecedorCompleto({ arquivado: true }))),
      quando('POST', `${ROTA_FORNECEDOR}/restaurar`, () => respostaJson(fornecedorCompleto())),
    )
    const { wrapper } = await abrir('/fornecedores')

    wrapper.findAllComponents({ name: 'MenuAcoes' })[0]!.vm.$emit('selecionar', 'arquivar')
    await flushPromises()

    expect(nomesVisiveis(wrapper)).toEqual(['Fotografia Ângela Lima'])
    const [mensagem, opcoes] = notificacoes.sucesso.mock.calls[0]!
    expect(mensagem).toBe('Buffet São João arquivado.')
    await (opcoes as { desfazer: () => Promise<void> }).desfazer()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_FORNECEDOR}/restaurar`)).toHaveLength(1)
    expect(nomesVisiveis(wrapper)).toEqual(['Buffet São João', 'Fotografia Ângela Lima'])
  })

  it('[COMPONENTE] excluir pede confirmação nomeando o fornecedor', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA, () => respostaJson(LISTA)),
      quando('DELETE', ROTA_FORNECEDOR, () => respostaVazia()),
    )
    const { wrapper, montagem } = await abrir('/fornecedores')
    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)

    wrapper.findAllComponents({ name: 'MenuAcoes' })[0]!.vm.$emit('selecionar', 'excluir')
    await flushPromises()

    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.nomeItem).toBe('Buffet São João')
    expect(confirmacao.mensagem).toBe(TEXTOS_FORNECEDORES.confirmarExclusaoTexto)
    await confirmacao.confirmar()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', ROTA_FORNECEDOR)).toHaveLength(1)
    expect(nomesVisiveis(wrapper)).toEqual(['Fotografia Ângela Lima'])
  })
})

describe('FornecedorView', () => {
  it('[COMPONENTE] mostra contato, observações e a seção de eventos em estado vazio', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson([])),
    )

    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    expect(wrapper.get('h1').text()).toBe('Buffet São João')
    expect(wrapper.get('[data-teste="resumo-fornecedor"]').text()).toContain('Marta Souza')
    expect(wrapper.get('[data-teste="observacoes"]').text()).toBe('Pede sinal de 30%.')
    expect(wrapper.findAll('[data-teste="canal-contato"]').map((canal) => canal.attributes('data-canal'))).toEqual([
      'telefone',
      'whatsapp',
      'email',
      'site',
      'instagram',
    ])
    const historico = wrapper.get('[data-teste="historico-eventos"]')
    expect(historico.text()).toContain(TEXTOS_FORNECEDORES.historicoTitulo)
    expect(historico.text()).toContain(TEXTOS_FORNECEDORES.historicoVazioTitulo)
    expect(wrapper.find('[data-teste="editar-fornecedor"]').exists()).toBe(true)
    expect(document.title).not.toContain('98765')
  })

  it('[COMPONENTE] arquivado mostra a faixa com Restaurar e esconde Editar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto({ arquivado: true, arquivadoEm: '2026-09-30T13:00:00Z' }))),
      quando('POST', `${ROTA_FORNECEDOR}/restaurar`, () => respostaJson(fornecedorCompleto())),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    expect(wrapper.get('[data-teste="faixa-arquivado"]').text()).toContain(TEXTOS_FORNECEDORES.arquivadoFaixa)
    expect(wrapper.find('[data-teste="editar-fornecedor"]').exists()).toBe(false)
    await wrapper.get('[data-teste="restaurar-fornecedor"]').trigger('click')
    await flushPromises()
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Buffet São João restaurado.')
    expect(wrapper.find('[data-teste="faixa-arquivado"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem contato orienta a editar; inexistente mostra não encontrado com volta', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () =>
        respostaJson(fornecedorCompleto({ telefone: null, email: null, site: null, instagram: null, observacoes: null })),
      ),
    )
    const primeira = await abrir(`/fornecedores/${ID_FORNECEDOR}`)
    expect(primeira.wrapper.get('[data-teste="sem-contato"]').text()).toBe(TEXTOS_FORNECEDORES.semContato)
    expect(primeira.wrapper.text()).toContain(TEXTOS_FORNECEDORES.semObservacoes)
    primeira.wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado)
    const segunda = await abrir(`/fornecedores/${ID_FORNECEDOR_2}`)
    expect(segunda.wrapper.text()).toContain(TEXTOS_FORNECEDORES.naoEncontradoTitulo)
    expect(segunda.wrapper.get('[data-teste="voltar"]').attributes('href')).toBe('/fornecedores')
  })
})

describe('FornecedorView — eventos em que participou', () => {
  const PARTICIPACOES = [
    {
      eventoId: '55555555-5555-4555-8555-555555555555',
      nomePrimeiraPessoa: 'Ana',
      nomeSegundaPessoa: 'João',
      dataEvento: '2026-12-12',
      eventoArquivado: false,
      status: 'Contratado',
    },
    {
      eventoId: '66666666-6666-4666-8666-666666666666',
      nomePrimeiraPessoa: 'Beatriz',
      nomeSegundaPessoa: 'Rafael',
      dataEvento: '2025-09-12',
      eventoArquivado: true,
      status: 'Cancelado',
    },
  ]

  it('[COMPONENTE] lista os eventos com data, status e selo de arquivado, com link para o módulo do evento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson(PARTICIPACOES)),
    )

    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    const itens = wrapper.get('[data-teste="lista-historico"]').findAll('li')
    expect(itens).toHaveLength(2)
    expect(itens[0]!.text()).toContain('Ana & João')
    expect(itens[0]!.text()).toContain('12 dez 2026')
    expect(itens[0]!.text()).toContain('Contratado')
    expect(itens[0]!.get('a').attributes('href')).toBe('/eventos/55555555-5555-4555-8555-555555555555/fornecedores')
    expect(itens[1]!.text()).toContain('Cancelado')
    expect(itens[1]!.text()).toContain('Arquivado')
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES.historicoVazioTitulo)
  })

  it('[COMPONENTE] falha ao carregar o histórico mostra mensagem com nova tentativa', async () => {
    let tentativas = 0
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(500, { title: 'Erro' }) : respostaJson(PARTICIPACOES)
      }),
    )

    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    const erro = wrapper.get('[data-teste="erro-historico"]')
    expect(erro.text()).toContain('Não foi possível carregar os eventos deste fornecedor.')
    await erro.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-teste="lista-historico"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] excluir fornecedor que participou de evento oferece arquivar e não chama o DELETE', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson(PARTICIPACOES)),
      quando('POST', `${ROTA_FORNECEDOR}/arquivar`, () => respostaJson(fornecedorCompleto({ arquivado: true, arquivadoEm: '2026-09-30T13:00:00Z' }))),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()

    const dialogo = document.body.querySelector('[data-teste="dialogo-confirmacao"]')
    expect(dialogo?.textContent).toContain('participou de 2 eventos e não pode ser excluído')
    const confirmar = Array.from(document.body.querySelectorAll('[data-teste="dialogo-confirmacao"] button')).find(
      (botao) => botao.textContent?.trim() === TEXTOS_FORNECEDORES.arquivar,
    ) as HTMLButtonElement
    confirmar.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', ROTA_FORNECEDOR)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_FORNECEDOR}/arquivar`)).toHaveLength(1)
  })

  it('[COMPONENTE] 422 do servidor ao excluir aparece no toast', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson([])),
      quando('DELETE', ROTA_FORNECEDOR, () =>
        respostaProblema(422, { title: 'Regra', detail: 'Este fornecedor já participou de eventos. Arquive-o em vez de excluir.' }),
      ),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()
    await useConfirmacaoExclusaoStore().confirmar()
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith('Este fornecedor já participou de eventos. Arquive-o em vez de excluir.')
  })
})

describe('FornecedorFormularioView', () => {
  async function escolherCategoria(alvo: VueWrapper, valor: string) {
    alvo.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', valor)
    await flushPromises()
  }

  it('[COMPONENTE] valida no cliente antes de enviar', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/fornecedores/novo')

    await wrapper.get('[data-teste="campo-nome-empresa"]').setValue('A')
    await wrapper.get('[data-teste="campo-telefone"]').setValue('11 abc')
    await wrapper.get('[data-teste="campo-site"]').setValue('javascript:alert(1)')
    await wrapper.get('[data-teste="campo-instagram"]').setValue('com espaco')
    await wrapper.get('[data-teste="formulario-fornecedor"]').trigger('submit')
    await flushPromises()

    const texto = wrapper.text()
    expect(texto).toContain(TEXTOS_FORNECEDORES.erroCategoria)
    expect(texto).toContain(TEXTOS_FORNECEDORES.erroEmpresaTamanho)
    expect(texto).toContain(TEXTOS_FORNECEDORES.erroTelefone)
    expect(texto).toContain(TEXTOS_FORNECEDORES.erroSite)
    expect(texto).toContain(TEXTOS_FORNECEDORES.erroInstagram)
    expect(chamadas(fetchSimulado, 'POST', ROTA)).toHaveLength(0)
  })

  it('[COMPONENTE] cadastra e vai para o detalhe com toast', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA, () => respostaJson(fornecedorCompleto(), 201)),
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
    )
    const { wrapper, montagem } = await abrir('/fornecedores/novo')

    await escolherCategoria(wrapper, 'Buffet')
    await wrapper.get('[data-teste="campo-nome-empresa"]').setValue('  Buffet São João ')
    await wrapper.get('[data-teste="campo-telefone"]').setValue('(11) 98765-4321')
    await wrapper.get('[data-teste="campo-instagram"]').setValue('@buffetsaojoao')
    await wrapper.get('[data-teste="formulario-fornecedor"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA)
    expect(corpoDaChamada(chamada!)).toEqual({
      categoria: 'Buffet',
      nomeEmpresa: 'Buffet São João',
      responsavel: null,
      telefone: '(11) 98765-4321',
      email: null,
      site: null,
      instagram: '@buffetsaojoao',
      observacoes: null,
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Buffet São João adicionado.')
    await aguardarRota(montagem.roteador, 'fornecedor')
  })

  it('[COMPONENTE] nome repetido aparece sob o campo e 409 avisa com toast mantendo os dados', async () => {
    let tentativa = 0
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('PUT', ROTA_FORNECEDOR, () => {
        tentativa += 1
        return tentativa === 1
          ? respostaProblema(422, { title: 'Regra', detail: 'Já existe um fornecedor com esse nome nessa categoria.', campo: 'nomeEmpresa' })
          : respostaProblema(409, { title: 'O registro foi alterado por outra operação. Tente novamente.' })
      }),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}/editar`)

    expect((wrapper.get('[data-teste="campo-nome-empresa"]').element as HTMLInputElement).value).toBe('Buffet São João')
    expect((wrapper.get('[data-teste="campo-instagram"]').element as HTMLInputElement).value).toBe('@buffetsaojoao')
    await wrapper.get('[data-teste="campo-nome-empresa"]').setValue('Buffet Oliveira')
    await wrapper.get('[data-teste="formulario-fornecedor"]').trigger('submit')
    await flushPromises()
    const erroCampo = wrapper.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erroCampo.some((texto) => texto.includes('Já existe um fornecedor com esse nome nessa categoria.'))).toBe(true)

    await wrapper.get('[data-teste="formulario-fornecedor"]').trigger('submit')
    await flushPromises()
    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_FORNECEDORES.erroConcorrencia)
    expect((wrapper.get('[data-teste="campo-nome-empresa"]').element as HTMLInputElement).value).toBe('Buffet Oliveira')
  })
})

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

describe('FornecedoresView — reestruturação da fundação', () => {
  it('[COMPONENTE] índice vem antes da lista; grupos usam rótulo, pilha e cartão rotulado', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson(LISTA)))
    const { wrapper } = await abrir('/fornecedores')

    const raiz = wrapper.get('.fornecedores')
    expect(raiz.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const corpo = wrapper.get('.fornecedores__corpo')
    expect(corpo.classes()).toContain('fornecedores__corpo--com-indice')
    const indice = corpo.get('[data-teste="indice-categorias"]')
    const lista = corpo.get('[data-teste="lista-fornecedores"]')
    expect(indice.element.compareDocumentPosition(lista.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(lista.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    expect(wrapper.find('.fornecedores__painel').exists()).toBe(false)

    const grupo = wrapper.findAll('[data-teste="grupo-categoria"]')[0]!
    expect(grupo.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--campo']))
    const titulo = grupo.get('h2')
    expect(titulo.classes()).toContain('texto-rotulo')
    expect(titulo.text()).toContain(TEXTOS_FORNECEDORES.quantidadeGrupo(1))
    const listaGrupo = grupo.get('ul')
    expect(listaGrupo.classes()).toContain('cartao')
    expect(listaGrupo.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
  })

  it('[COMPONENTE] nome longo sem espaços é renderizado inteiro na linha', async () => {
    const nomeLongo = 'AtelierFloralJardimSecretoDecoracoesParaEventosEEventosEspeciaisLtda'
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson([resumoFornecedor({ nomeEmpresa: nomeLongo })])))
    const { wrapper } = await abrir('/fornecedores')

    expect(nomesVisiveis(wrapper)).toEqual([nomeLongo])
  })

  it('[COMPONENTE] sem fornecedores ativos esconde o índice e o corpo fica em uma coluna', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson([resumoFornecedor({ arquivado: true })])))
    const { wrapper } = await abrir('/fornecedores')

    expect(wrapper.find('[data-teste="indice-categorias"]').exists()).toBe(false)
    expect(wrapper.get('.fornecedores__corpo').classes()).not.toContain('fornecedores__corpo--com-indice')
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.vazioTitulo)
  })

  it('[UNITÁRIO] a view usa só o ritmo e abre a lateral do índice por contêiner, sem @media nem sticky', () => {
    const estilo = estiloDe(lerFonte('views/fornecedores/FornecedoresView.vue'))

    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
    expect(estilo).toMatch(/container:\s*fornecedores\s*\/\s*inline-size/)
    expect(estilo).toMatch(/container:\s*lista-fornecedores\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container fornecedores \(min-width: 64rem\)/)
    expect(estilo).not.toMatch(/sticky/)
  })

  it('[UNITÁRIO] IndiceCategorias vira fichas horizontais só quando o próprio contêiner é largo', () => {
    const estilo = estiloDe(lerFonte('componentes/base/IndiceCategorias.vue'))

    expect(estilo).toMatch(/container:\s*indice-categorias\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container indice-categorias \(min-width: 30rem\)\s*\{\s*\.indice-categorias__lista\s*\{\s*flex-flow:\s*row wrap/)
  })

  it('[UNITÁRIO] LinhaFornecedor empilha numa lista estreita e usa o ritmo no espaçamento interno', () => {
    const estilo = estiloDe(lerFonte('componentes/base/LinhaFornecedor.vue'))

    expect(estilo).toMatch(/padding:\s*var\(--p-ritmo-grupo\) var\(--p-ritmo-cartao\)/)
    expect(estilo).toMatch(/@container lista-fornecedores \(max-width: 39\.99rem\)/)
    expect(estilo.indexOf('@container lista-fornecedores')).toBeGreaterThan(estilo.indexOf('@media (min-width: 640px)'))
  })
})

describe('FornecedorView — reestruturação da fundação', () => {
  const PARTICIPACAO_LONGA = {
    eventoId: '77777777-7777-4777-8777-777777777777',
    nomePrimeiraPessoa: 'MariaEduardaFigueiredoDeAlbuquerqueCavalcanti',
    nomeSegundaPessoa: 'Rafael',
    dataEvento: '2026-11-07',
    eventoArquivado: false,
    status: 'EmNegociacao',
  }

  it('[COMPONENTE] ficha vem antes do histórico; blocos usam rótulo, pilha e cartão rotulado', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson([PARTICIPACAO_LONGA])),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    const raiz = wrapper.get('.fornecedor')
    expect(raiz.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const corpo = raiz.get('.fornecedor__corpo')
    const ficha = corpo.get('[data-teste="ficha-fornecedor"]')
    const historico = corpo.get('[data-teste="historico-eventos"]')
    expect(ficha.element.tagName).toBe('ASIDE')
    expect(ficha.element.compareDocumentPosition(historico.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ficha.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))

    for (const secao of [...ficha.findAll('section'), historico]) {
      expect(secao.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--campo']))
      const titulo = secao.get('h2')
      expect(titulo.classes()).toContain('texto-rotulo')
      expect(secao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    }
    expect(ficha.findAll('.cartao')).toHaveLength(2)
    expect(ficha.get('[data-teste="observacoes"]').classes()).toContain('texto-corrido')
    expect(ficha.get('[data-teste="datas-fornecedor"]').classes()).toContain('texto-legenda')
    expect(historico.get('[data-teste="lista-historico"]').classes()).toContain('cartao')
    expect(historico.get('a').text()).toBe('MariaEduardaFigueiredoDeAlbuquerqueCavalcanti & Rafael')
    expect(historico.text()).toContain('Em negociação')
  })

  it('[COMPONENTE] histórico vazio e com falha ficam dentro de cartão, com a ficha visível', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaProblema(500, { title: 'Erro' })),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    expect(wrapper.get('[data-teste="erro-historico"]').classes()).toContain('cartao')
    expect(wrapper.find('[data-teste="ficha-fornecedor"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-teste="canal-contato"]').length).toBeGreaterThan(0)

    wrapper.unmount()
    fetchSimulado.mockReset()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson([])),
    )
    const segunda = await abrir(`/fornecedores/${ID_FORNECEDOR}`)
    const vazio = segunda.wrapper.get('[data-teste="historico-eventos"]').get('.cartao')
    expect(vazio.text()).toContain(TEXTOS_FORNECEDORES.historicoVazioTitulo)
  })

  it('[COMPONENTE] arquivado mostra a faixa antes do corpo e não encontrado agrupa erro e volta numa pilha', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto({ arquivado: true, arquivadoEm: '2026-09-30T13:00:00Z' }))),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson([])),
    )
    const primeira = await abrir(`/fornecedores/${ID_FORNECEDOR}`)
    const faixa = primeira.wrapper.get('[data-teste="faixa-arquivado"]')
    const corpo = primeira.wrapper.get('.fornecedor__corpo')
    expect(faixa.element.compareDocumentPosition(corpo.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    primeira.wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado)
    const segunda = await abrir(`/fornecedores/${ID_FORNECEDOR_2}`)
    const voltar = segunda.wrapper.get('[data-teste="voltar"]')
    expect(voltar.element.parentElement?.classList.contains('pilha--bloco')).toBe(true)
  })

  it('[COMPONENTE] nome de empresa longo sem espaços aparece inteiro no título', async () => {
    const nomeLongo = 'AtelierFloralJardimSecretoDecoracoesParaEventosEEventosEspeciaisLtda'
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto({ nomeEmpresa: nomeLongo }))),
      quando('GET', `${ROTA_FORNECEDOR}/eventos`, () => respostaJson([])),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`, true)

    expect(wrapper.get('h1').text()).toBe(nomeLongo)
  })

  it('[UNITÁRIO] a view usa só o ritmo e abre colunas por contêiner, sem @media', () => {
    const estilo = estiloDe(lerFonte('views/fornecedores/FornecedorView.vue'))

    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
    expect(estilo).not.toMatch(/box-shadow/)
    expect(estilo).toMatch(/container:\s*fornecedor\s*\/\s*inline-size/)
    expect(estilo).toMatch(/container:\s*historico-fornecedor\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container fornecedor \(min-width: 64rem\)\s*\{\s*\.fornecedor__corpo\s*\{\s*grid-template-columns:\s*var\(--fornecedor-largura-ficha\) minmax\(0, 1fr\)/)
    expect(estilo).toMatch(/@container fornecedor \(min-width: 40rem\) and \(max-width: 63\.99rem\)/)
    expect(estilo).toMatch(/@container historico-fornecedor \(min-width: 36rem\)/)
    expect(estilo).toMatch(/position:\s*sticky/)
    expect(estilo).toMatch(/overflow-y:\s*auto/)
  })

  it('[UNITÁRIO] o título do CabecalhoPagina quebra palavras longas', () => {
    const estilo = estiloDe(lerFonte('componentes/base/CabecalhoPagina.vue'))

    expect(estilo).toMatch(/\.cabecalho-pagina \.cabecalho-pagina__titulo\s*\{[^}]*overflow-wrap:\s*anywhere/)
  })
})

describe('FornecedorFormularioView — reestruturação da fundação', () => {
  const legendas = (alvo: VueWrapper) => alvo.findAll('fieldset > legend').map((legenda) => legenda.text())
  const camposDoGrupo = (alvo: VueWrapper, grupo: string) =>
    alvo.get(`[data-teste="${grupo}"]`).findAll('[data-teste^="campo-"]').map((campo) => campo.attributes('data-teste'))

  it('[COMPONENTE] criação: cabeçalho orientador e campos agrupados em Empresa, Contato e Uso interno na ordem visual', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/fornecedores/novo')

    const pagina = wrapper.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_FORNECEDORES.novoTitulo)
    expect(pagina.text()).toContain(TEXTOS_FORNECEDORES.formNovoDescricao)
    expect(pagina.find('[data-teste="formulario-fornecedor"]').exists()).toBe(true)
    expect(wrapper.get('.formulario-fornecedor').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    expect(wrapper.get('[data-teste="formulario-fornecedor"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))

    expect(legendas(wrapper)).toEqual([TEXTOS_FORNECEDORES.grupoEmpresa, TEXTOS_FORNECEDORES.grupoContato, TEXTOS_FORNECEDORES.grupoInterno])
    for (const legenda of wrapper.findAll('fieldset > legend')) {
      expect(legenda.classes()).toContain('texto-rotulo')
    }
    expect(camposDoGrupo(wrapper, 'grupo-empresa')).toEqual(['campo-categoria', 'campo-nome-empresa', 'campo-site', 'campo-instagram'])
    expect(camposDoGrupo(wrapper, 'grupo-contato')).toEqual(['campo-responsavel', 'campo-telefone', 'campo-email'])
    expect(camposDoGrupo(wrapper, 'grupo-interno')).toEqual(['campo-observacoes'])
    expect(wrapper.get('[data-teste="grupo-empresa"]').findAll('.formulario-fornecedor__colunas')).toHaveLength(2)
    expect(wrapper.get('[data-teste="grupo-contato"]').findAll('.formulario-fornecedor__colunas')).toHaveLength(1)

    expect(wrapper.findComponent({ name: 'Select' }).props('placeholder')).toBe(TEXTOS_FORNECEDORES.categoriaPlaceholder)
    expect(wrapper.get('[data-teste="grupo-interno"]').text()).toContain('Só a assessoria vê.')
    expect(wrapper.get('[data-teste="salvar-fornecedor"]').text()).toBe(TEXTOS_FORNECEDORES.salvarNovo)
  })

  it('[COMPONENTE] edição: descrição do cabeçalho é o nome carregado e não muda enquanto digita', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())))
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}/editar`)

    const cabecalho = () => wrapper.get('.cabecalho-pagina')
    expect(cabecalho().get('h1').text()).toBe(TEXTOS_FORNECEDORES.editarTitulo)
    expect(cabecalho().text()).toContain('Buffet São João')
    expect(cabecalho().text()).not.toContain(TEXTOS_FORNECEDORES.formNovoDescricao)

    await wrapper.get('[data-teste="campo-nome-empresa"]').setValue('Buffet Oliveira')
    expect(cabecalho().text()).toContain('Buffet São João')
    expect(cabecalho().text()).not.toContain('Buffet Oliveira')
    expect(wrapper.get('[data-teste="salvar-fornecedor"]').text()).toBe(TEXTOS_FORNECEDORES.salvarEdicao)
  })

  it('[COMPONENTE] erro só aparece após enviar, foca o primeiro inválido na ordem visual e some ao digitar', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/fornecedores/novo')

    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'Buffet')
    await flushPromises()
    await wrapper.get('[data-teste="campo-nome-empresa"]').setValue('Buffet Sol')
    await wrapper.get('[data-teste="campo-telefone"]').setValue('11 abc')
    await wrapper.get('[data-teste="campo-telefone"]').trigger('blur')
    await wrapper.get('[data-teste="campo-site"]').setValue('javascript:alert(1)')
    await wrapper.get('[data-teste="campo-site"]').trigger('blur')
    await flushPromises()
    expect(wrapper.findAll('[data-teste="erro-campo"]')).toHaveLength(0)

    await wrapper.get('[data-teste="formulario-fornecedor"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.erroSite)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.erroTelefone)
    await aguardarAte(() => expect(document.activeElement?.id).toBe('fornecedor-site'))

    await wrapper.get('[data-teste="campo-site"]').setValue('buffetsol.com.br')
    await flushPromises()
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES.erroSite)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.erroTelefone)
    expect(chamadas(fetchSimulado, 'POST', ROTA)).toHaveLength(0)
  })

  it('[COMPONENTE] escolher a categoria após a tentativa limpa o erro sem esperar sair do campo', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/fornecedores/novo')

    await wrapper.get('[data-teste="formulario-fornecedor"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.erroCategoria)

    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'Fotografia')
    await flushPromises()
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES.erroCategoria)
  })

  it('[COMPONENTE] falha do serviço ao carregar a edição mostra erro com nova tentativa e sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_FORNECEDOR, () => respostaProblema(500, { title: 'Erro' })))
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}/editar`)

    expect(wrapper.find('[data-teste="formulario-fornecedor"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.erroDetalheTitulo)
    expect(wrapper.get('.pagina-formulario').find('.formulario-fornecedor').exists()).toBe(true)
  })

  it('[SEGURANÇA] 403 na edição mostra o aviso da assessoria sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_FORNECEDOR, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}/editar`)

    expect(wrapper.find('[data-teste="formulario-fornecedor"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.semAcesso)
  })

  it('[COMPONENTE] fornecedor inexistente mostra não encontrado sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_FORNECEDOR, () => respostaProblema(404, { title: 'Não encontrado' })))
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}/editar`)

    expect(wrapper.find('[data-teste="formulario-fornecedor"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.naoEncontradoTitulo)
  })

  it('[UNITÁRIO] a view usa .pagina-formulario, ritmo e @container, sem @media nem validarCampo no template', () => {
    const fonte = lerFonte('views/fornecedores/FornecedorFormularioView.vue')
    const estilo = estiloDe(fonte)

    expect(fonte).toContain('class="pagina-formulario"')
    expect(fonte).not.toMatch(/validarCampo\('/)
    expect(fonte).toMatch(/@blur="formulario\.validarAoSair\('nomeEmpresa'\)"/)
    expect(fonte).toMatch(/@update:model-value="formulario\.revalidarAoDigitar\('nomeEmpresa'\)"/)
    expect(fonte).toMatch(/const CAMPOS = \['categoria', 'nomeEmpresa', 'site', 'instagram', 'responsavel', 'telefone', 'email', 'observacoes'\]/)
    expect(estilo).toMatch(/container:\s*formulario-fornecedor\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container formulario-fornecedor \(min-width: 40rem\)\s*\{\s*\.formulario-fornecedor__colunas\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/largura-leitura/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
    expect(estilo).not.toMatch(/box-shadow/)
  })

  it('[UNITÁRIO] a descrição do CabecalhoPagina quebra palavras longas', () => {
    const estilo = estiloDe(lerFonte('componentes/base/CabecalhoPagina.vue'))

    expect(estilo).toMatch(/\.cabecalho-pagina__descricao\s*\{[^}]*overflow-wrap:\s*anywhere/)
  })
})

describe('rotas de fornecedores', () => {
  it('[SEGURANÇA] todas as rotas são exclusivas da assessoria', () => {
    for (const caminho of ['/fornecedores', '/fornecedores/novo', `/fornecedores/${ID_FORNECEDOR}`, `/fornecedores/${ID_FORNECEDOR}/editar`]) {
      const rota = router.resolve(caminho)
      expect(rota.matched.length).toBeGreaterThan(0)
      expect(rota.meta.somenteAssessoria).toBe(true)
    }
  })
})

describe('FornecedoresView — categorias essenciais', () => {
  it('[COMPONENTE] carteira de casamentos e aniversário mostra as essenciais sem fornecedor ativo, depois da lista', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA, () => respostaJson(LISTA)),
      quando('GET', ROTA_EVENTOS_ATIVOS, () => respostaJson(carteira('Casamento', 'Casamento', 'Aniversario'))),
    )
    const { wrapper } = await abrir('/fornecedores')
    await aguardarAte(() => expect(wrapper.get('[data-teste="cobertura-fornecedores"]').attributes('data-carteira')).toBe('sim'))

    expect(wrapper.get('[data-teste="cobertura-frase"]').text()).toBe('Para os eventos pela frente: 2 casamentos e 1 aniversário.')
    expect(wrapper.get('[data-teste="cobertura-contagem"]').text()).toBe('2 de 10 categorias essenciais com fornecedor ativo')
    expect(wrapper.get('[data-teste="cobertura-falta-Decoracao"]').text()).toContain('Essencial para 3 eventos pela frente')
    expect(wrapper.get('[data-teste="cobertura-falta-Decoracao"]').text()).toContain('1 arquivado nesta categoria')
    expect(wrapper.find('[data-teste="cobertura-falta-Buffet"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="cobertura-reaproveitamento"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_EVENTOS_ATIVOS)).toHaveLength(1)

    const filhos = wrapper.get('.fornecedores__corpo').element.children
    const classes = Array.from(filhos).map((filho) => filho.className)
    expect(classes.findIndex((nome) => nome.includes('fornecedores__principal'))).toBeLessThan(
      classes.findIndex((nome) => nome.includes('fornecedores__cobertura')),
    )
  })

  it('[COMPONENTE] carteira de 15 anos e comemoração cobra Iluminação e som e não cita casamento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA, () => respostaJson(LISTA)),
      quando('GET', ROTA_EVENTOS_ATIVOS, () => respostaJson(carteira('QuinzeAnos', 'Comemoracao'))),
    )
    const { wrapper } = await abrir('/fornecedores')
    await aguardarAte(() => expect(wrapper.get('[data-teste="cobertura-frase"]').text()).toBe('Para os eventos pela frente: 1 festa de 15 anos e 1 comemoração.'))

    expect(wrapper.get('[data-teste="cobertura-falta-IluminacaoSom"]').text()).toContain('Essencial para 1 evento pela frente')
    expect(wrapper.find('[data-teste="cobertura-falta-ConvitesPapelaria"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="cobertura-fornecedores"]').text()).not.toMatch(/casamento/i)
  })

  it.each([
    ['tipo desconhecido', () => respostaJson([resumoEvento({ tipo: 'Formatura' as unknown as TipoEvento })])],
    ['falha da lista de eventos', () => respostaProblema(500, { title: 'Erro' })],
  ])('[COMPONENTE] com %s usa a regra dos 4 tipos sem erro na tela', async (_rotulo, resposta) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaJson(LISTA)), quando('GET', ROTA_EVENTOS_ATIVOS, resposta))
    const { wrapper } = await abrir('/fornecedores')
    await flushPromises()

    expect(wrapper.get('[data-teste="cobertura-fornecedores"]').attributes('data-carteira')).toBe('nao')
    expect(wrapper.get('[data-teste="cobertura-frase"]').text()).toBe(TEXTOS_COBERTURA_FORNECEDORES.semCarteira())
    expect(wrapper.get('[data-teste="cobertura-falta-EspacoLocal"]').text()).toContain('Essencial nos 4 tipos de evento')
    expect(nomesVisiveis(wrapper)).toEqual(['Buffet São João', 'Fotografia Ângela Lima'])
  })

  it('[COMPONENTE] base vazia ensina o reaproveitamento e mantém um só botão de adicionar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA, () => respostaJson([])),
      quando('GET', ROTA_EVENTOS_ATIVOS, () => respostaJson(carteira('Aniversario'))),
    )
    const { wrapper } = await abrir('/fornecedores')
    await aguardarAte(() => expect(wrapper.get('[data-teste="cobertura-fornecedores"]').attributes('data-carteira')).toBe('sim'))

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES.vazioTexto)
    expect(wrapper.get('[data-teste="cobertura-contagem"]').text()).toBe('0 de 6 categorias essenciais com fornecedor ativo')
    expect(wrapper.findAll('[data-teste="cobertura-reaproveitamento"] li')).toHaveLength(3)
    expect(wrapper.findAll('[data-teste^="adicionar-fornecedor"]')).toHaveLength(1)
    expect(wrapper.get('[data-teste="cobertura-fornecedores"]').findAll('a, button')).toHaveLength(0)
  })

  it('[COMPONENTE] erro ao carregar fornecedores não mostra o bloco', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA, () => respostaProblema(500, { title: 'Erro' })))
    const { wrapper } = await abrir('/fornecedores')

    expect(wrapper.find('[data-teste="cobertura-fornecedores"]').exists()).toBe(false)
  })
})
