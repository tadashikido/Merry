import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EnvioArquivo from '@/componentes/base/EnvioArquivo.vue'
import IndicadorEtapas from '@/componentes/base/IndicadorEtapas.vue'
import ListaProblemasLinha from '@/componentes/base/ListaProblemasLinha.vue'
import type { ItemProblemaLinha, TextosEnvioArquivo, TextosListaProblemas } from '@/componentes/base/tipos'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

const TEXTOS_ENVIO: TextosEnvioArquivo = {
  rotulo: 'Planilha de convidados',
  instrucao: 'Arraste a planilha aqui ou',
  botao: 'Escolher arquivo',
  trocar: 'Trocar arquivo',
  limites: 'CSV de até 2 MB.',
  carregando: 'Lendo a planilha…',
}

const TEXTOS_PROBLEMAS: TextosListaProblemas = {
  rotulo: 'Linhas para corrigir',
  filtro: 'Filtrar linhas por tipo',
  todos: 'Todos',
  linha: (numero) => `Linha ${numero}`,
  mostrarMais: (quantidade) => `Mostrar mais ${quantidade}`,
  vazio: 'Nenhuma linha com problema.',
}

function problema(linha: number, tipo: 'Erro' | 'Aviso', campo: string | null = 'Telefone'): ItemProblemaLinha {
  return {
    linha,
    titulo: `Pessoa ${linha}`,
    problemas: [{ tipo, rotuloTipo: tipo, variante: tipo === 'Erro' ? 'erro' : 'informacao', campo, mensagem: `Mensagem ${linha}` }],
  }
}

describe('IndicadorEtapas', () => {
  it('[COMPONENTE] marca a etapa atual com aria-current e as anteriores como concluídas', () => {
    wrapper = mount(IndicadorEtapas, { props: { etapas: ['Escolha', 'Confira', 'Pronto'], atual: 1, rotulo: 'Etapas' } })

    const etapas = wrapper.findAll('[data-teste="etapa"]')
    expect(etapas.map((etapa) => etapa.attributes('data-situacao'))).toEqual(['concluida', 'atual', 'futura'])
    expect(etapas[1]!.attributes('aria-current')).toBe('step')
    expect(etapas[0]!.attributes('aria-current')).toBeUndefined()
    expect(etapas[0]!.text()).toContain('(concluída)')
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Etapas')
    expect(wrapper.text()).toContain('Etapa 2 de 3: Confira')
  })

  it('[COMPONENTE] limita o índice às etapas existentes', () => {
    wrapper = mount(IndicadorEtapas, { props: { etapas: ['A', 'B'], atual: 7, rotulo: 'Etapas' } })

    expect(wrapper.findAll('[aria-current="step"]')[0]!.text()).toContain('B')
  })
})

describe('EnvioArquivo', () => {
  it('[COMPONENTE] tem entrada rotulada ligada aos limites e emite o arquivo escolhido', async () => {
    wrapper = mount(EnvioArquivo, { props: { id: 'envio', textos: TEXTOS_ENVIO, aceite: '.csv' }, global, attachTo: document.body })
    const entrada = wrapper.get('[data-teste="envio-arquivo-entrada"]')
    expect(wrapper.get('label[for="envio"]').text()).toBe('Planilha de convidados')
    expect(entrada.attributes('aria-describedby')).toBe('envio-limites')
    expect(entrada.attributes('accept')).toBe('.csv')

    const planilha = new File(['Nome'], 'lista.csv', { type: 'text/csv' })
    Object.defineProperty(entrada.element, 'files', { value: [planilha], configurable: true })
    await entrada.trigger('change')

    expect(wrapper.emitted('selecionar')?.[0]).toEqual([planilha])
  })

  it('[COMPONENTE] aceita arquivo solto na área e sinaliza o arraste', async () => {
    wrapper = mount(EnvioArquivo, { props: { id: 'envio', textos: TEXTOS_ENVIO }, global })
    const area = wrapper.get('[data-teste="envio-arquivo"]')
    const planilha = new File(['Nome'], 'lista.csv')

    await area.trigger('dragover', { dataTransfer: { files: [] } })
    expect(area.classes()).toContain('envio-arquivo--arrastando')
    await area.trigger('drop', { dataTransfer: { files: [planilha] } })

    expect(area.classes()).not.toContain('envio-arquivo--arrastando')
    expect(wrapper.emitted('selecionar')?.[0]).toEqual([planilha])
  })

  it('[COMPONENTE] mostra arquivo selecionado, carregando e erro anunciado', async () => {
    wrapper = mount(EnvioArquivo, {
      props: { id: 'envio', textos: TEXTOS_ENVIO, arquivo: { name: 'lista.csv', size: 2048 } },
      global,
    })
    expect(wrapper.get('[data-teste="envio-arquivo-nome"]').text()).toContain('lista.csv')
    expect(wrapper.get('[data-teste="envio-arquivo-botao"]').text()).toContain('Trocar arquivo')

    await wrapper.setProps({ carregando: true })
    expect(wrapper.get('[role="status"]').text()).toBe('Lendo a planilha…')
    expect(wrapper.get('[data-teste="envio-arquivo-botao"]').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ carregando: false, erro: 'Envie uma planilha salva como CSV.' })
    const erro = wrapper.get('[data-teste="envio-arquivo-erro"]')
    expect(erro.attributes('role')).toBe('alert')
    expect(wrapper.get('[data-teste="envio-arquivo-entrada"]').attributes('aria-describedby')).toBe('envio-limites envio-erro')
    expect(wrapper.get('[data-teste="envio-arquivo-entrada"]').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] desabilitado não aceita arquivo solto', async () => {
    wrapper = mount(EnvioArquivo, { props: { id: 'envio', textos: TEXTOS_ENVIO, desabilitado: true }, global })

    await wrapper.get('[data-teste="envio-arquivo"]').trigger('drop', { dataTransfer: { files: [new File(['x'], 'a.csv')] } })

    expect(wrapper.emitted('selecionar')).toBeUndefined()
  })

  it('[COMPONENTE] focar leva o foco ao botão', () => {
    wrapper = mount(EnvioArquivo, { props: { id: 'envio', textos: TEXTOS_ENVIO }, global, attachTo: document.body })

    ;(wrapper.vm as unknown as { focar: () => void }).focar()

    expect(document.activeElement?.id).toBe('envio-botao')
  })
})

describe('ListaProblemasLinha', () => {
  it('[COMPONENTE] agrupa por linha, mostra tipo em texto e mensagem com coluna', () => {
    wrapper = mount(ListaProblemasLinha, { props: { itens: [problema(6, 'Erro')], textos: TEXTOS_PROBLEMAS }, global })

    const item = wrapper.get('[data-teste="lista-problemas-item"]')
    expect(item.text()).toContain('Linha 6')
    expect(item.text()).toContain('Pessoa 6')
    expect(item.get('[data-teste="badge-status"]').text()).toBe('Erro')
    expect(item.text()).toContain('Telefone: Mensagem 6')
    expect(wrapper.get('ul').attributes('aria-label')).toBe('Linhas para corrigir')
  })

  it('[COMPONENTE] filtra por tipo com contagem e só mostra filtro quando há mais de um tipo', async () => {
    const itens = [problema(2, 'Erro'), problema(3, 'Aviso', null), problema(4, 'Erro')]
    wrapper = mount(ListaProblemasLinha, {
      props: { itens, textos: TEXTOS_PROBLEMAS, filtros: [{ tipo: 'Erro', rotulo: 'Erros' }, { tipo: 'Aviso', rotulo: 'Avisos' }, { tipo: 'Duplicado', rotulo: 'Repetidas' }] },
      global,
    })

    const filtro = wrapper.get('[data-teste="lista-problemas-filtro"]')
    expect(filtro.text()).toContain('Todos (3)')
    expect(filtro.text()).toContain('Erros (2)')
    expect(filtro.text()).not.toContain('Repetidas')
    const opcaoAvisos = filtro.findAll('button').find((botao) => botao.text().includes('Avisos'))!
    await opcaoAvisos.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-teste="lista-problemas-item"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Linha 3')
  })

  it('[COMPONENTE] limita a lista e mostra mais sob demanda', async () => {
    const itens = [1, 2, 3, 4, 5].map((linha) => problema(linha, 'Erro'))
    wrapper = mount(ListaProblemasLinha, { props: { itens, textos: TEXTOS_PROBLEMAS, limite: 2 }, global })

    expect(wrapper.findAll('[data-teste="lista-problemas-item"]')).toHaveLength(2)
    await wrapper.get('[data-teste="lista-problemas-mais"]').trigger('click')
    expect(wrapper.findAll('[data-teste="lista-problemas-item"]')).toHaveLength(4)
    await wrapper.get('[data-teste="lista-problemas-mais"]').trigger('click')
    expect(wrapper.findAll('[data-teste="lista-problemas-item"]')).toHaveLength(5)
    expect(wrapper.find('[data-teste="lista-problemas-mais"]').exists()).toBe(false)
  })

  it('[COMPONENTE] mostra texto de vazio sem itens', () => {
    wrapper = mount(ListaProblemasLinha, { props: { itens: [], textos: TEXTOS_PROBLEMAS }, global })

    expect(wrapper.text()).toContain('Nenhuma linha com problema.')
  })
})

describe('DialogoConfirmacao', () => {
  function montarDialogo(executando = false) {
    return mount(DialogoConfirmacao, {
      props: {
        visivel: true,
        titulo: 'Importar só os convites prontos?',
        mensagem: '1 convite fica de fora.',
        rotuloConfirmar: 'Importar 2 convites',
        rotuloCancelar: 'Voltar e corrigir',
        executando,
      },
      global,
      attachTo: document.body,
    })
  }

  it('[COMPONENTE] é um alertdialog com título, mensagem e ações nomeadas', async () => {
    wrapper = montarDialogo()
    await flushPromises()

    const dialogo = document.querySelector('[role="alertdialog"]')!
    expect(dialogo.textContent).toContain('Importar só os convites prontos?')
    const idMensagem = dialogo.getAttribute('aria-describedby')!
    expect(document.getElementById(idMensagem)?.textContent).toContain('1 convite fica de fora.')
    expect(document.querySelector('[data-teste="dialogo-confirmacao-confirmar"]')?.textContent).toContain('Importar 2 convites')
  })

  it('[COMPONENTE] confirmar emite e voltar fecha com cancelar', async () => {
    wrapper = montarDialogo()
    await flushPromises()

    ;(document.querySelector('[data-teste="dialogo-confirmacao-confirmar"]') as HTMLButtonElement).click()
    ;(document.querySelector('[data-teste="dialogo-confirmacao-cancelar"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(wrapper.emitted('confirmar')).toHaveLength(1)
    expect(wrapper.emitted('cancelar')).toHaveLength(1)
    expect(wrapper.emitted('update:visivel')?.[0]).toEqual([false])
  })

  it('[COMPONENTE] executando bloqueia voltar', async () => {
    wrapper = montarDialogo(true)
    await flushPromises()

    const voltar = document.querySelector('[data-teste="dialogo-confirmacao-cancelar"]') as HTMLButtonElement
    expect(voltar.disabled).toBe(true)
  })
})
