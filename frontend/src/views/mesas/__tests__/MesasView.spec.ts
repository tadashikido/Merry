import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import { avisoExemplo, mapaExemplo, MESA_PADRINHOS, MESA_TIOS } from '@/__tests__/auxiliaresMesas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { TEXTOS_MESAS } from '@/textos/mesas'
import type { ListaConvitesDto } from '@/tipos/convidados'
import type { MapaMesasDto } from '@/tipos/mesas'
import * as arquivo from '@/utilitarios/arquivo'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch, type Rota } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-mesas', 'impressao-mesas', 'evento-convidados')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_MESAS = `${ROTA_EVENTO}/mesas`

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

function rotasPadrao(mapa: MapaMesasDto = mapaExemplo(), ...extras: Rota[]): Rota[] {
  return [quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), quando('GET', ROTA_MESAS, () => respostaJson(mapa)), ...extras]
}

async function abrir(caminho = `/eventos/${ID_EVENTO}/mesas`) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

function linha(nome: string) {
  return wrapper!.findAll('[data-teste="linha-pessoa-mesa"]').find((item) => item.text().includes(nome))!
}

async function marcar(nome: string) {
  await linha(nome).get('input[type="checkbox"]').setValue(true)
  await flushPromises()
}

function dialogo(): HTMLElement {
  return document.body.querySelector('[data-teste="dialogo-sentar"]') as HTMLElement
}

async function excluirMesa(rotulo: string) {
  const menu = wrapper!
    .findAllComponents(MenuAcoes)
    .find((item) => item.attributes('data-teste') === 'menu-mesa' && item.props('rotuloAcessivel') === TEXTOS_MESAS.acoesMesa(rotulo))
  menu!.vm.$emit('selecionar', 'excluir')
  await flushPromises()
  const confirmacao = useConfirmacaoExclusaoStore()
  const aviso = confirmacao.avisoAtual()
  await confirmacao.confirmar()
  await flushPromises()
  return aviso
}

function titulosMesas(): string[] {
  return wrapper!.findAll('[data-teste="mesa"]').map((mesa) => mesa.get('h3').text())
}

describe('MesasView', { timeout: 30_000 }, () => {
  it('[COMPONENTE] excluir mesa some na hora, oferece desfazer e desfazer devolve as pessoas sentadas sem DELETE', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo(), quando('DELETE', `${ROTA_MESAS}/${MESA_PADRINHOS}`, () => respostaVazia())))
    await abrir()

    const aviso = await excluirMesa('Mesa 2 · Padrinhos')

    expect(aviso.mensagem).toBe(TEXTOS_MESAS.mesaExcluida('Mesa 2 · Padrinhos'))
    expect(titulosMesas()).toEqual(['Mesa dos noivos', 'Mesa 3 · Tios'])
    expect(wrapper!.get('[data-teste="coluna-sem-mesa"]').text()).toContain('Rui Fontes')

    await aviso.desfazer!()
    await aviso.aoFechar!()
    await flushPromises()

    expect(titulosMesas()).toEqual(['Mesa dos noivos', 'Mesa 2 · Padrinhos', 'Mesa 3 · Tios'])
    expect(wrapper!.get('[data-teste="coluna-sem-mesa"]').text()).not.toContain('Rui Fontes')
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_MESAS.mesaRestaurada('Mesa 2 · Padrinhos'))
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_MESAS}/${MESA_PADRINHOS}`)).toHaveLength(0)
  })

  it('[COMPONENTE] fechar o aviso conclui a exclusão e desfazer tardio informa que já foi concluída', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo(), quando('DELETE', `${ROTA_MESAS}/${MESA_TIOS}`, () => respostaVazia())))
    await abrir()

    const aviso = await excluirMesa('Mesa 3 · Tios')
    await aviso.aoFechar!()
    await flushPromises()
    await aviso.desfazer!()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_MESAS}/${MESA_TIOS}`)).toHaveLength(1)
    expect(notificacoes.erro).toHaveBeenCalledWith(MENSAGENS_PADRAO.exclusaoJaConcluida)
  })

  it('[COMPONENTE] simula falha do servidor ao concluir: mesa volta e mostra erro nomeando a mesa', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo(), quando('DELETE', `${ROTA_MESAS}/${MESA_TIOS}`, () => respostaProblema(500))))
    await abrir()

    const aviso = await excluirMesa('Mesa 3 · Tios')
    expect(titulosMesas()).not.toContain('Mesa 3 · Tios')
    await aviso.aoFechar!()
    await flushPromises()

    expect(titulosMesas()).toContain('Mesa 3 · Tios')
    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_MESAS.erroExcluirMesa('Mesa 3 · Tios'))
  })

  it('[COMPONENTE] mostra totais, sem mesa por convite e mesas na ordem com ocupação, sem dados de saúde', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir()

    expect(wrapper!.get('h1').text()).toBe('Mesas')
    expect(wrapper!.get('[data-teste="contagem-sentados"]').text()).toContain('2')
    expect(wrapper!.get('[data-teste="contagem-sem-mesa"]').text()).toContain('3')
    const semMesa = wrapper!.get('[data-teste="coluna-sem-mesa"]')
    expect(semMesa.text()).toContain('Carla Souza')
    expect(semMesa.text()).toContain('=Primo Zeca')
    expect(semMesa.text()).not.toContain('Rui Fontes')
    const mesas = wrapper!.findAll('[data-teste="mesa"]')
    expect(mesas.map((mesa) => mesa.get('h3').text())).toEqual(['Mesa dos noivos', 'Mesa 2 · Padrinhos', 'Mesa 3 · Tios'])
    expect(mesas[0]!.classes()).toContain('mesas__mesa--especial')
    expect(mesas[1]!.get('[data-teste="texto-ocupacao"]').text()).toBe('1 de 3')
    expect(mesas[2]!.text()).toContain(TEXTOS_MESAS.mesaVazia)
    expect(wrapper!.get('div.mesas').text().toLowerCase()).not.toContain('restri')
    expect(document.title).toContain('Mesas')
  })

  it('[COMPONENTE] selecionar uma pessoa sugere o resto do convite e "Selecionar convite" marca todos', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir()

    expect(wrapper!.find('[data-teste="contagem-selecao"]').exists()).toBe(false)
    await marcar('Carla Souza')

    expect(wrapper!.get('[data-teste="contagem-selecao"]').text()).toBe('1 pessoa selecionada')
    expect(wrapper!.get('[data-teste="dica-convite"]').text()).toBe('Mais 1 deste convite sem mesa')
    await wrapper!.get('[data-teste="selecionar-convite"]').trigger('click')
    await flushPromises()

    expect(wrapper!.get('[data-teste="contagem-selecao"]').text()).toBe('2 pessoas selecionadas')
    expect(wrapper!.find('[data-teste="dica-convite"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="tirar-da-mesa"]').exists()).toBe(false)
    await wrapper!.get('[data-teste="limpar-selecao"]').trigger('click')
    await flushPromises()
    expect(wrapper!.find('[data-teste="contagem-selecao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] "Sentar em…" desabilita mesas sem lugar e envia todos os selecionados de uma vez', async () => {
    const depois = mapaExemplo()
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo(), quando('POST', `${ROTA_MESAS}/${MESA_PADRINHOS}/pessoas`, () => respostaJson(depois))))
    await abrir()
    await marcar('Carla Souza')
    await marcar('Pedro Souza')

    await wrapper!.get('[data-teste="sentar-em"]').trigger('click')
    await flushPromises()

    const opcoes = [...dialogo().querySelectorAll('[data-teste="opcao-mesa"]')]
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      expect.stringContaining('Só 1 livre'),
      expect.stringContaining('2 livres'),
      expect.stringContaining('2 livres'),
    ])
    expect((opcoes[0]!.querySelector('input') as HTMLInputElement).disabled).toBe(true)
    const confirmar = dialogo().querySelector('[data-teste="confirmar-sentar"]') as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    ;(opcoes[1]!.querySelector('input') as HTMLInputElement).click()
    await flushPromises()
    ;(dialogo().querySelector('[data-teste="confirmar-sentar"]') as HTMLButtonElement).click()
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'POST', `${ROTA_MESAS}/${MESA_PADRINHOS}/pessoas`)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({ convidadosIds: ['p-carla', 'p-pedro'] })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('2 pessoas sentadas na Mesa 2 · Padrinhos.')
    expect(wrapper!.find('[data-teste="contagem-selecao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] capacidade recusada pelo servidor mostra a mensagem no diálogo e recarrega', async () => {
    const mensagem = 'A Mesa 3 · Tios tem 2 lugares e 1 livre. Escolha até 1 pessoa ou outra mesa.'
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo(), quando('POST', `${ROTA_MESAS}/${MESA_TIOS}/pessoas`, () => respostaProblema(422, { detail: mensagem }))))
    await abrir()
    await marcar('Carla Souza')
    await marcar('Pedro Souza')
    await wrapper!.get('[data-teste="sentar-em"]').trigger('click')
    await flushPromises()

    ;(dialogo().querySelectorAll('[data-teste="opcao-mesa"] input')[2] as HTMLInputElement).click()
    await flushPromises()
    ;(dialogo().querySelector('[data-teste="confirmar-sentar"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(dialogo().querySelector('[data-teste="mensagem-sentar"]')?.textContent).toContain(mensagem)
    expect(chamadas(fetchSimulado, 'GET', ROTA_MESAS)).toHaveLength(2)
  })

  it('[COMPONENTE] conflito ao tirar da mesa avisa e recarrega', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo(), quando('POST', `${ROTA_MESAS}/retirada`, () => respostaProblema(409, { title: 'O registro foi alterado por outra operação.' }))))
    await abrir()
    await marcar('Rui Fontes')

    await wrapper!.get('[data-teste="tirar-da-mesa"]').trigger('click')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_MESAS.erroConflito)
    expect(chamadas(fetchSimulado, 'GET', ROTA_MESAS)).toHaveLength(2)
  })

  it('[COMPONENTE] aviso de saída por recusa lista as pessoas e "Entendi" dispensa', async () => {
    const comAviso = mapaExemplo({ avisosSaida: [avisoExemplo()] })
    rotearFetch(fetchSimulado, ...rotasPadrao(comAviso, quando('POST', `${ROTA_MESAS}/avisos-saida/dispensa`, () => respostaJson(mapaExemplo()))))
    await abrir()

    const aviso = wrapper!.get('[data-teste="aviso-saida"]')
    expect(aviso.text()).toContain('1 pessoa saiu da mesa porque deixou de confirmar presença.')
    expect(aviso.text()).toContain('Bia Lima')
    expect(aviso.text()).toContain('recusou, saiu da Mesa 2 · Padrinhos')
    await aviso.get('[data-teste="dispensar-aviso"]').trigger('click')
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'POST', `${ROTA_MESAS}/avisos-saida/dispensa`)
    expect(corpoDaChamada(envio[0]!)).toEqual({ convidadosIds: [avisoExemplo().convidadoId] })
    expect(wrapper!.find('[data-teste="aviso-saida"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="anuncio-mesas"]').text()).toBe(TEXTOS_MESAS.avisoDispensado)
  })

  it('[COMPONENTE] convite dividido explica a distribuição ao tocar', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir()

    await linha('Carla Souza').get('[data-teste="convite-dividido"]').trigger('click')
    await flushPromises()

    expect(wrapper!.get('[data-teste="detalhe-divisao"]').text()).toBe('Família Souza: 1 na Mesa dos noivos, 2 sem mesa.')
  })

  it('[COMPONENTE] filtros por grupo e busca reduzem as listas e "Limpar filtros" restaura', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir()

    await wrapper!.get('[data-teste="busca-mesas"]').setValue('zeca')
    await flushPromises()

    expect(wrapper!.get('[data-teste="resultados-mesas"]').text()).toContain('1 de 5 pessoas')
    expect(wrapper!.get('[data-teste="coluna-sem-mesa"]').text()).not.toContain('Carla Souza')
    expect(wrapper!.findAll('[data-teste="mesa"]')[1]!.text()).toContain(TEXTOS_MESAS.mesaSemResultado)
    await wrapper!.get('[data-teste="limpar-filtros"]').trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-teste="coluna-sem-mesa"]').text()).toContain('Carla Souza')
  })

  it('[COMPONENTE] nova mesa valida no cliente, mostra erro do servidor no campo e cria', async () => {
    let tentativas = 0
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(
        mapaExemplo(),
        quando('POST', ROTA_MESAS, () => {
          tentativas++
          return tentativas === 1
            ? respostaProblema(422, { detail: 'Já existe uma mesa com este número neste evento.', campo: 'numero' })
            : respostaJson({ ...mapaExemplo().mesas[2], id: 'nova', numero: 4, nome: null, capacidade: 6 }, 201)
        }),
      ),
    )
    await abrir()

    await wrapper!.get('[data-teste="nova-mesa"]').trigger('click')
    await flushPromises()
    const numero = document.body.querySelector('#mesa-numero') as HTMLInputElement
    expect(numero.value).toBe('4')
    const salvar = () => (document.body.querySelector('[data-teste="salvar-mesa"]') as HTMLButtonElement).click()
    salvar()
    await flushPromises()

    expect(document.body.textContent).toContain('Já existe uma mesa com este número neste evento.')
    salvar()
    await flushPromises()

    expect(notificacoes.sucesso).toHaveBeenCalledWith('Mesa 4 criada.')
    expect(chamadas(fetchSimulado, 'POST', ROTA_MESAS)).toHaveLength(2)
  })

  it('[COMPONENTE] evento arquivado fica somente leitura, mas exporta', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo({ eventoArquivado: true, avisosSaida: [avisoExemplo()] })))
    await abrir()

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_MESAS.arquivado)
    expect(wrapper!.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="nova-mesa"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="menu-mesa"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="dispensar-aviso"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="baixar-planilha"]').exists()).toBe(true)
  })

  it('[COMPONENTE] baixar planilha gera o CSV do mapa', async () => {
    const baixar = vi.spyOn(arquivo, 'baixarTexto').mockImplementation(() => undefined)
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir()

    await wrapper!.get('[data-teste="baixar-planilha"]').trigger('click')

    expect(baixar).toHaveBeenCalledTimes(1)
    const [nome, conteudo] = baixar.mock.calls[0]!
    expect(nome).toMatch(/^mesas-.+\.csv$/)
    expect(conteudo).toContain("'=Primo Zeca")
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_MESAS.csvBaixado)
  })

  it('[COMPONENTE] sem mesas e sem confirmados mostra o primeiro passo', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(mapaExemplo({ mesas: [], pessoas: [] })))
    await abrir()

    expect(wrapper!.get('[data-teste="estado-vazio"]').text()).toContain('Crie as mesas do casamento')
    expect(wrapper!.find('[data-teste="nova-mesa-vazio"]').exists()).toBe(true)
  })

  it('[COMPONENTE] todos sentados mostra a confirmação na coluna sem mesa', async () => {
    const mapa = mapaExemplo()
    rotearFetch(fetchSimulado, ...rotasPadrao({ ...mapa, pessoas: mapa.pessoas.map((pessoa) => ({ ...pessoa, mesaId: MESA_TIOS })), totais: { ...mapa.totais, semMesa: 0 } }))
    await abrir()

    expect(wrapper!.get('[data-teste="todos-sentados"]').text()).toBe(TEXTOS_MESAS.todosSentados)
  })

  it('[COMPONENTE] erro ao carregar oferece tentar de novo', async () => {
    let falhar = true
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_MESAS, () => (falhar ? respostaProblema(500) : respostaJson(mapaExemplo()))),
    )
    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_MESAS.erroCarregar)
    falhar = false
    await wrapper!.get('[data-teste="estado-erro"] button').trigger('click')
    await flushPromises()
    expect(wrapper!.findAll('[data-teste="mesa"]')).toHaveLength(3)
  })

  it('[SEGURANÇA] sem permissão mostra o estado próprio sem tentar de novo e 404 mostra evento não encontrado', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), quando('GET', ROTA_MESAS, () => respostaProblema(403)))
    await abrir()
    expect(wrapper!.text()).toContain(TEXTOS_MESAS.semAcesso)
    expect(wrapper!.find('[data-teste="estado-erro"] button').exists()).toBe(false)
    wrapper!.unmount()

    rotearFetch(fetchSimulado, quando('GET', ROTA_MESAS, () => respostaProblema(404)))
    await abrir()
    expect(wrapper!.text()).toContain(TEXTOS_MESAS.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="voltar-eventos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] no celular alterna entre os painéis Sem mesa e Mesas', async () => {
    simularMatchMedia(true)
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir()

    const abas = wrapper!.get('[data-teste="abas-mesas"]')
    expect(abas.text()).toContain('Sem mesa (3)')
    expect(abas.text()).toContain('Mesas (3)')
    expect(wrapper!.get('[data-teste="coluna-mesas"]').attributes('style')).toContain('display: none')
    await abas.findAll('[role="button"], button').find((botao) => botao.text().startsWith('Mesas'))!.trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-teste="coluna-sem-mesa"]').attributes('style')).toContain('display: none')
    expect(wrapper!.find('[data-teste="menu-exportar"]').exists()).toBe(true)
  })
})

describe('ImpressaoMesasView', { timeout: 30_000 }, () => {
  it('[COMPONENTE] monta a folha com anfitriões, totais, mesas e sem mesa, e imprime', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(`/eventos/${ID_EVENTO}/mesas/impressao`)

    const folha = wrapper!.get('[data-teste="mapa-mesas-impressao"]')
    expect(folha.get('h1').text()).toBe('Ana Beatriz & Bruno')
    expect(folha.findAll('[data-teste="totais-impressao"] li').map((item) => item.text())).toEqual(['3 mesas', '7 lugares', '2 sentados', '5 lugares livres', '3 sem mesa'])
    const mesas = folha.findAll('[data-teste="mesa-impressao"]')
    expect(mesas).toHaveLength(3)
    expect(mesas[0]!.text()).toContain('Ana Souza')
    expect(folha.get('[data-teste="sem-mesa-impressao"]').text()).toContain('Pedro Souza (criança)')
    expect(folha.get('[data-teste="sem-mesa-impressao"]').text()).toContain('=Primo Zeca (acompanhante)')
    expect(folha.text()).not.toContain('@')
    await wrapper!.get('[data-teste="imprimir"]').trigger('click')
    expect(imprimir).toHaveBeenCalled()
    expect(document.title).toContain('Mapa de mesas')
  })
})

describe('ConvidadosView com mesas', { timeout: 30_000 }, () => {
  it('[COMPONENTE] cada pessoa confirmada mostra a mesa ou "Sem mesa"', async () => {
    const lista: ListaConvitesDto = {
      convites: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          nome: 'Família Souza',
          grupo: null,
          limiteAcompanhantes: 0,
          statusEnvio: 'NaoEnviado',
          convidados: [
            { id: 'p1', nome: 'Carla Souza', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false, mesaId: MESA_PADRINHOS },
            { id: 'p2', nome: 'Pedro Souza', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false, mesaId: null },
            { id: 'p3', nome: 'Ana Souza', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Pendente', acompanhante: false, possuiRestricao: false, mesaId: null },
          ],
          criadoEm: '2026-09-28T12:00:00Z',
          atualizadoEm: '2026-09-28T12:00:00Z',
          respondidoEm: null,
        },
      ],
      totais: {
        convites: 1,
        pessoas: 3,
        adultos: 3,
        criancas: 0,
        acompanhantesPermitidos: 0,
        confirmados: { adultos: 2, criancas: 0, total: 2 },
        pendentes: { adultos: 1, criancas: 0, total: 1 },
        recusados: { adultos: 0, criancas: 0, total: 0 },
      },
      convidadosEstimados: null,
      eventoArquivado: false,
      mesas: [{ id: MESA_PADRINHOS, numero: 2, nome: 'Padrinhos', especial: false }],
    }
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_EVENTO}/convites`, () => respostaJson(lista)),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.findAll('[data-teste="mesa-pessoa"]').map((item) => item.text())).toEqual(['Mesa 2 · Padrinhos', 'Sem mesa'])
    expect(wrapper!.find('[data-teste="abrir-mesas"]').exists()).toBe(true)
  })
})
