import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { RouterView, createMemoryHistory, createRouter, type Router } from 'vue-router'

import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'
import { useAlteracoesNaoSalvas, useRastreioAlteracoes } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { SESSAO_EXEMPLO } from '@/__tests__/auxiliaresAutenticacao'
import { useAlteracoesNaoSalvasStore } from '@/stores/alteracoesNaoSalvas'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { TEXTOS_ALTERACOES_NAO_SALVAS } from '@/textos/mensagens'

const alterado = ref(false)
let liberar: () => void = () => undefined

const TelaFormulario = defineComponent({
  setup() {
    const { liberarSaida } = useAlteracoesNaoSalvas(alterado)
    liberar = liberarSaida
    return () => h('form', { 'data-teste': 'tela-formulario' })
  },
})

const TelaDestino = { render: () => h('p', { 'data-teste': 'tela-destino' }, 'destino') }

const Raiz = () => h('div', [h(RouterView), h(ProvedorFeedback)])

let wrapper: VueWrapper | undefined

async function montar(): Promise<Router> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const autenticacao = useAutenticacaoStore()
  autenticacao.tokenAcesso = SESSAO_EXEMPLO.tokenAcesso
  autenticacao.usuario = SESSAO_EXEMPLO.usuario
  const roteador = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/formulario', component: TelaFormulario },
      { path: '/destino', component: TelaDestino },
    ],
  })
  await roteador.push('/formulario')
  await roteador.isReady()
  wrapper = mount(Raiz, {
    attachTo: document.body,
    global: { plugins: [roteador, pinia, [PrimeVue, { unstyled: true }], ToastService] },
  })
  await flushPromises()
  return roteador
}

function botao(dataTeste: string): HTMLButtonElement {
  const encontrado = document.body.querySelector<HTMLButtonElement>(`[data-teste="${dataTeste}"]`)
  if (!encontrado) {
    throw new Error(`Botão ${dataTeste} não encontrado`)
  }
  return encontrado
}

function dispararSaidaDaAba(): Event {
  const evento = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(evento)
  return evento
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  alterado.value = false
  document.body.innerHTML = ''
})

describe('useRastreioAlteracoes', () => {
  it('[UNITÁRIO] detecta alteração em relação ao estado inicial e volta a limpo ao desfazer', () => {
    const estado = ref({ nome: 'Ana', pessoas: ['Bruno'] })
    const rastreio = useRastreioAlteracoes(() => estado.value)

    expect(rastreio.temAlteracoes.value).toBe(false)
    estado.value.nome = 'Ana Clara'
    expect(rastreio.temAlteracoes.value).toBe(true)
    estado.value.nome = 'Ana'
    expect(rastreio.temAlteracoes.value).toBe(false)
    estado.value.pessoas.push('Carla')
    expect(rastreio.temAlteracoes.value).toBe(true)
  })

  it('[UNITÁRIO] fixarEstadoInicial adota o estado atual como referência', () => {
    const estado = ref({ nome: '' })
    const rastreio = useRastreioAlteracoes(() => estado.value)

    estado.value.nome = 'Carregado da API'
    expect(rastreio.temAlteracoes.value).toBe(true)
    rastreio.fixarEstadoInicial()
    expect(rastreio.temAlteracoes.value).toBe(false)
  })
})

describe('useFormulario — rastreio de alterações', () => {
  it('[UNITÁRIO] expõe temAlteracoes sobre os valores e refixa ao redefinir', () => {
    const formulario = useFormulario({ titulo: '', dias: 10 as number | null }, {})

    expect(formulario.temAlteracoes.value).toBe(false)
    formulario.valores.titulo = 'Provar o vestido'
    expect(formulario.temAlteracoes.value).toBe(true)
    formulario.redefinir()
    expect(formulario.temAlteracoes.value).toBe(false)
    formulario.valores.dias = null
    expect(formulario.temAlteracoes.value).toBe(true)
  })

  it('[UNITÁRIO] considera o estado adicional fora dos valores', () => {
    const status = ref('AFazer')
    const formulario = useFormulario({ titulo: 'Confirmar buffet' }, {}, { estadoAdicional: () => status.value })

    expect(formulario.temAlteracoes.value).toBe(false)
    status.value = 'Concluida'
    expect(formulario.temAlteracoes.value).toBe(true)
    formulario.fixarEstadoInicial()
    expect(formulario.temAlteracoes.value).toBe(false)
  })
})

describe('useAlteracoesNaoSalvas — proteção de saída', () => {
  it('[COMPONENTE] sem alterações navega direto, sem diálogo', async () => {
    const roteador = await montar()

    await roteador.push('/destino')
    await flushPromises()

    expect(roteador.currentRoute.value.path).toBe('/destino')
    expect(document.body.textContent).not.toContain(TEXTOS_ALTERACOES_NAO_SALVAS.titulo)
  })

  it('[COMPONENTE] com alterações abre o diálogo e "Continuar editando" mantém a pessoa no formulário', async () => {
    const roteador = await montar()
    alterado.value = true

    const navegacao = roteador.push('/destino')
    await flushPromises()

    expect(roteador.currentRoute.value.path).toBe('/formulario')
    const dialogo = document.body.querySelector('[role="alertdialog"]')
    expect(dialogo?.textContent).toContain(TEXTOS_ALTERACOES_NAO_SALVAS.titulo)
    expect(dialogo?.textContent).toContain(TEXTOS_ALTERACOES_NAO_SALVAS.mensagem)
    expect(botao('dialogo-confirmacao-cancelar').textContent).toContain(TEXTOS_ALTERACOES_NAO_SALVAS.continuar)
    expect(botao('dialogo-confirmacao-confirmar').textContent).toContain(TEXTOS_ALTERACOES_NAO_SALVAS.descartar)

    botao('dialogo-confirmacao-cancelar').click()
    await navegacao
    await flushPromises()

    expect(roteador.currentRoute.value.path).toBe('/formulario')
    expect(useAlteracoesNaoSalvasStore().visivel).toBe(false)
    expect(document.body.querySelector('[data-teste="tela-formulario"]')).not.toBeNull()
  })

  it('[COMPONENTE] "Descartar alterações" conclui a navegação solicitada', async () => {
    const roteador = await montar()
    alterado.value = true

    const navegacao = roteador.push('/destino')
    await flushPromises()
    botao('dialogo-confirmacao-confirmar').click()
    await navegacao
    await flushPromises()

    expect(roteador.currentRoute.value.path).toBe('/destino')
    expect(useAlteracoesNaoSalvasStore().visivel).toBe(false)
  })

  it('[COMPONENTE] liberarSaida (salvar ou cancelar) navega sem diálogo mesmo com alterações', async () => {
    const roteador = await montar()
    alterado.value = true
    liberar()

    await roteador.push('/destino')
    await flushPromises()

    expect(roteador.currentRoute.value.path).toBe('/destino')
    expect(useAlteracoesNaoSalvasStore().visivel).toBe(false)
  })

  it('[COMPONENTE] fechar a aba com alterações cancela o beforeunload; sem alterações ou liberado não', async () => {
    await montar()

    expect(dispararSaidaDaAba().defaultPrevented).toBe(false)
    alterado.value = true
    expect(dispararSaidaDaAba().defaultPrevented).toBe(true)
    liberar()
    expect(dispararSaidaDaAba().defaultPrevented).toBe(false)
  })

  it('[SEGURANÇA] sem sessão (logout ou sessão encerrada) não segura a pessoa na tela', async () => {
    const roteador = await montar()
    alterado.value = true
    const autenticacao = useAutenticacaoStore()
    autenticacao.tokenAcesso = null
    autenticacao.usuario = null

    expect(dispararSaidaDaAba().defaultPrevented).toBe(false)
    await roteador.push('/destino')
    await flushPromises()

    expect(roteador.currentRoute.value.path).toBe('/destino')
    expect(useAlteracoesNaoSalvasStore().visivel).toBe(false)
  })

  it('[COMPONENTE] remove o listener de beforeunload ao sair da tela', async () => {
    const roteador = await montar()
    await roteador.push('/destino')
    await flushPromises()
    alterado.value = true

    expect(dispararSaidaDaAba().defaultPrevented).toBe(false)
  })
})
