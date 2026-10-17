import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_FORNECEDOR, ID_FORNECEDOR_2, fornecedorCompleto, resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import router from '@/router'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import { RaizRotas, chamadas, quando, rotearFetch } from '../../casamentos/__tests__/auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA = '/api/fornecedores'
const ROTA_FORNECEDOR = `${ROTA}/${ID_FORNECEDOR}`

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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('fornecedor-novo'))
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
  it('[COMPONENTE] mostra contato, observações e a seção de casamentos em estado vazio', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson([])),
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
    const historico = wrapper.get('[data-teste="historico-casamentos"]')
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

describe('FornecedorView — casamentos em que participou', () => {
  const PARTICIPACOES = [
    {
      casamentoId: '55555555-5555-4555-8555-555555555555',
      nomePrimeiraPessoa: 'Ana',
      nomeSegundaPessoa: 'João',
      dataCasamento: '2026-12-12',
      casamentoArquivado: false,
      status: 'Contratado',
    },
    {
      casamentoId: '66666666-6666-4666-8666-666666666666',
      nomePrimeiraPessoa: 'Beatriz',
      nomeSegundaPessoa: 'Rafael',
      dataCasamento: '2025-09-12',
      casamentoArquivado: true,
      status: 'Cancelado',
    },
  ]

  it('[COMPONENTE] lista os casamentos com data, status e selo de arquivado, com link para o módulo do casamento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson(PARTICIPACOES)),
    )

    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    const itens = wrapper.get('[data-teste="lista-historico"]').findAll('li')
    expect(itens).toHaveLength(2)
    expect(itens[0]!.text()).toContain('Ana & João')
    expect(itens[0]!.text()).toContain('12 dez 2026')
    expect(itens[0]!.text()).toContain('Contratado')
    expect(itens[0]!.get('a').attributes('href')).toBe('/casamentos/55555555-5555-4555-8555-555555555555/fornecedores')
    expect(itens[1]!.text()).toContain('Cancelado')
    expect(itens[1]!.text()).toContain('Arquivado')
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES.historicoVazioTitulo)
  })

  it('[COMPONENTE] falha ao carregar o histórico mostra mensagem com nova tentativa', async () => {
    let tentativas = 0
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(500, { title: 'Erro' }) : respostaJson(PARTICIPACOES)
      }),
    )

    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    const erro = wrapper.get('[data-teste="erro-historico"]')
    expect(erro.text()).toContain('Não foi possível carregar os casamentos deste fornecedor.')
    await erro.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-teste="lista-historico"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] excluir fornecedor que participou de casamento oferece arquivar e não chama o DELETE', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson(PARTICIPACOES)),
      quando('POST', `${ROTA_FORNECEDOR}/arquivar`, () => respostaJson(fornecedorCompleto({ arquivado: true, arquivadoEm: '2026-09-30T13:00:00Z' }))),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()

    const dialogo = document.body.querySelector('[data-teste="dialogo-confirmacao"]')
    expect(dialogo?.textContent).toContain('participou de 2 casamentos e não pode ser excluído')
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
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson([])),
      quando('DELETE', ROTA_FORNECEDOR, () =>
        respostaProblema(422, { title: 'Regra', detail: 'Este fornecedor já participou de casamentos. Arquive-o em vez de excluir.' }),
      ),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()
    await useConfirmacaoExclusaoStore().confirmar()
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith('Este fornecedor já participou de casamentos. Arquive-o em vez de excluir.')
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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('fornecedor'))
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

describe('FornecedoresView — reestruturação Nossia', () => {
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
    const nomeLongo = 'AtelierFloralJardimSecretoDecoracoesParaCasamentosEEventosEspeciaisLtda'
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

  it('[UNITÁRIO] a view usa só o ritmo e abre a lateral do índice por contêiner, sem @media', () => {
    const estilo = estiloDe(lerFonte('views/fornecedores/FornecedoresView.vue'))

    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
    expect(estilo).toMatch(/container:\s*fornecedores\s*\/\s*inline-size/)
    expect(estilo).toMatch(/container:\s*lista-fornecedores\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container fornecedores \(min-width: 64rem\)/)
    expect(estilo).toMatch(/position:\s*sticky/)
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

describe('FornecedorView — reestruturação Nossia', () => {
  const PARTICIPACAO_LONGA = {
    casamentoId: '77777777-7777-4777-8777-777777777777',
    nomePrimeiraPessoa: 'MariaEduardaFigueiredoDeAlbuquerqueCavalcanti',
    nomeSegundaPessoa: 'Rafael',
    dataCasamento: '2026-11-07',
    casamentoArquivado: false,
    status: 'EmNegociacao',
  }

  it('[COMPONENTE] ficha vem antes do histórico; blocos usam rótulo, pilha e cartão rotulado', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto())),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson([PARTICIPACAO_LONGA])),
    )
    const { wrapper } = await abrir(`/fornecedores/${ID_FORNECEDOR}`)

    const raiz = wrapper.get('.fornecedor')
    expect(raiz.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const corpo = raiz.get('.fornecedor__corpo')
    const ficha = corpo.get('[data-teste="ficha-fornecedor"]')
    const historico = corpo.get('[data-teste="historico-casamentos"]')
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
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaProblema(500, { title: 'Erro' })),
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
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson([])),
    )
    const segunda = await abrir(`/fornecedores/${ID_FORNECEDOR}`)
    const vazio = segunda.wrapper.get('[data-teste="historico-casamentos"]').get('.cartao')
    expect(vazio.text()).toContain(TEXTOS_FORNECEDORES.historicoVazioTitulo)
  })

  it('[COMPONENTE] arquivado mostra a faixa antes do corpo e não encontrado agrupa erro e volta numa pilha', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto({ arquivado: true, arquivadoEm: '2026-09-30T13:00:00Z' }))),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson([])),
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
    const nomeLongo = 'AtelierFloralJardimSecretoDecoracoesParaCasamentosEEventosEspeciaisLtda'
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_FORNECEDOR, () => respostaJson(fornecedorCompleto({ nomeEmpresa: nomeLongo }))),
      quando('GET', `${ROTA_FORNECEDOR}/casamentos`, () => respostaJson([])),
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

describe('rotas de fornecedores', () => {
  it('[SEGURANÇA] todas as rotas são exclusivas da assessoria', () => {
    for (const caminho of ['/fornecedores', '/fornecedores/novo', `/fornecedores/${ID_FORNECEDOR}`, `/fornecedores/${ID_FORNECEDOR}/editar`]) {
      const rota = router.resolve(caminho)
      expect(rota.matched.length).toBeGreaterThan(0)
      expect(rota.meta.somenteAssessoria).toBe(true)
    }
  })
})
