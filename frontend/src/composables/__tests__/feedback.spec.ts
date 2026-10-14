import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'

import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { DURACAO_TOAST_ERRO, DURACAO_TOAST_SUCESSO, useNotificacao } from '@/composables/useNotificacao'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'

type Api = ReturnType<typeof useConfirmarExclusao> & ReturnType<typeof useNotificacao>

function montarHarness() {
  let api: Api | undefined
  const Harness = defineComponent({
    setup() {
      api = { ...useConfirmarExclusao(), ...useNotificacao() }
      return () => h(ProvedorFeedback)
    },
  })
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [createPinia(), [PrimeVue, { unstyled: true }], ToastService] },
  })
  if (!api) {
    throw new Error('Harness não inicializado')
  }
  return { wrapper, api }
}

function elemento(seletor: string): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(seletor)
}

function botao(dataTeste: string): HTMLButtonElement {
  const encontrado = document.body.querySelector<HTMLButtonElement>(`[data-teste="${dataTeste}"]`)
  if (!encontrado) {
    throw new Error(`Botão ${dataTeste} não encontrado`)
  }
  return encontrado
}

function adiado() {
  let resolver: () => void = () => undefined
  let rejeitar: (motivo: Error) => void = () => undefined
  const promessa = new Promise<void>((res, rej) => {
    resolver = res
    rejeitar = rej
  })
  return { promessa, resolver, rejeitar }
}

describe('confirmação de exclusão e toast', () => {
  let montado: VueWrapper | undefined

  afterEach(() => {
    montado?.unmount()
    document.body.innerHTML = ''
  })

  it('[COMPONENTE] abre alertdialog nomeando o item com Cancelar focado e Excluir destrutivo', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.confirmarExclusao({ nomeItem: 'Ana Souza', aoConfirmar: vi.fn() })
    await flushPromises()

    const dialogo = elemento('[role="alertdialog"]')
    expect(dialogo).not.toBeNull()
    expect(dialogo?.textContent).toContain('Excluir “Ana Souza”?')
    expect(dialogo?.getAttribute('aria-describedby')).toBe('dialogo-exclusao-mensagem')
    expect(elemento('#dialogo-exclusao-mensagem')?.textContent).toContain(MENSAGENS_PADRAO.exclusaoMensagem)
    expect(botao('cancelar-exclusao').textContent?.trim()).toBe('Cancelar')
    expect(botao('cancelar-exclusao').hasAttribute('autofocus')).toBe(true)
    expect(botao('confirmar-exclusao').textContent?.trim()).toBe('Excluir')
  })

  it('[COMPONENTE] cancelar fecha sem executar a exclusão', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper
    const aoConfirmar = vi.fn()
    const aoCancelar = vi.fn()

    api.confirmarExclusao({ nomeItem: 'Mesa 12', aoConfirmar, aoCancelar })
    await flushPromises()
    botao('cancelar-exclusao').click()
    await flushPromises()

    expect(aoConfirmar).not.toHaveBeenCalled()
    expect(aoCancelar).toHaveBeenCalledTimes(1)
    expect(elemento('[role="alertdialog"]')).toBeNull()
  })

  it('[COMPONENTE] mantém o diálogo aberto com Excluir em carregando até a operação terminar e confirma com toast', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper
    const operacao = adiado()
    const aoConfirmar = vi.fn(() => operacao.promessa)

    api.confirmarExclusao({ nomeItem: 'Mesa 12', aoConfirmar })
    await flushPromises()
    botao('confirmar-exclusao').click()
    await flushPromises()

    expect(elemento('[role="alertdialog"]')).not.toBeNull()
    expect(botao('cancelar-exclusao').disabled).toBe(true)
    expect(botao('confirmar-exclusao').disabled).toBe(true)
    botao('confirmar-exclusao').click()
    expect(aoConfirmar).toHaveBeenCalledTimes(1)

    operacao.resolver()
    await flushPromises()

    expect(elemento('[role="alertdialog"]')).toBeNull()
    expect(document.body.textContent).toContain('“Mesa 12” foi excluído.')
  })

  it('[COMPONENTE] simula falha na exclusão: fecha o diálogo e mostra toast de erro com próximo passo', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper
    const operacao = adiado()

    api.confirmarExclusao({ nomeItem: 'Mesa 13', aoConfirmar: () => operacao.promessa })
    await flushPromises()
    botao('confirmar-exclusao').click()
    await flushPromises()
    operacao.rejeitar(new Error('Falha de rede'))
    await flushPromises()

    expect(elemento('[role="alertdialog"]')).toBeNull()
    expect(document.body.textContent).toContain(MENSAGENS_PADRAO.erroGenericoTitulo)
    expect(document.body.textContent).toContain(MENSAGENS_PADRAO.erroGenericoMensagem)
    expect(document.body.textContent).not.toContain('foi excluído')
  })

  it('[COMPONENTE] exibe toast de sucesso e de erro com mensagens padrão', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.sucesso(MENSAGENS_PADRAO.salvoComSucesso)
    api.erro()
    await flushPromises()

    const texto = document.body.textContent ?? ''
    expect(texto).toContain(MENSAGENS_PADRAO.salvoComSucesso)
    expect(texto).toContain(MENSAGENS_PADRAO.erroGenericoTitulo)
    expect(texto).toContain(MENSAGENS_PADRAO.erroGenericoMensagem)
  })

  it('[COMPONENTE] toast com desfazer mostra o botão, fecha e executa a operação inversa', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper
    const desfazer = vi.fn()

    api.sucesso('Casamento de Ana & João arquivado.', { desfazer })
    await flushPromises()

    expect(document.body.textContent).toContain('Casamento de Ana & João arquivado.')
    botao('toast-desfazer').click()
    await flushPromises()

    expect(desfazer).toHaveBeenCalledTimes(1)
    expect(elemento('[data-teste="toast-desfazer"]')).toBeNull()
  })

  it('[COMPONENTE] toast sem operação inversa não oferece desfazer e aceita título como segundo argumento', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.sucesso('Detalhe do que aconteceu.', 'Salvo')
    await flushPromises()

    expect(document.body.textContent).toContain('Salvo')
    expect(document.body.textContent).toContain('Detalhe do que aconteceu.')
    expect(elemento('[data-teste="toast-desfazer"]')).toBeNull()
  })

  it('[UNITÁRIO] mantém erro visível por mais tempo que sucesso', () => {
    expect(DURACAO_TOAST_SUCESSO).toBe(5000)
    expect(DURACAO_TOAST_ERRO).toBeGreaterThan(DURACAO_TOAST_SUCESSO)
  })
})
