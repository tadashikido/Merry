import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { obrigatorio } from '@/utilitarios/validacao'

const RAIZ = resolve(__dirname, '../..')
const MANIPULADOR_BLUR = /(?:@blur|v-on:blur)="([^"]*)"/g
const MANIPULADOR_PERMITIDO = /AoSair\b|^sair[A-Z]\w*$|^emit\('blur'\)$/

function listarComponentes(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) {
      return nome === '__tests__' ? [] : listarComponentes(caminho)
    }
    return nome.endsWith('.vue') ? [caminho] : []
  })
}

const componentes = listarComponentes(RAIZ).map((caminho) => ({
  arquivo: relative(RAIZ, caminho).split('\\').join('/'),
  fonte: readFileSync(caminho, 'utf-8'),
}))

describe('guarda da validação ao sair do campo', () => {
  it('[UNITÁRIO] nenhum @blur valida direto com validarCampo ou validar()', () => {
    const achados = componentes.flatMap(({ arquivo, fonte }) =>
      [...fonte.matchAll(MANIPULADOR_BLUR)]
        .map((achado) => achado[1] ?? '')
        .filter((manipulador) => /validarCampo|(?:^|\W)validar\(/.test(manipulador))
        .map((manipulador) => `${arquivo}: @blur="${manipulador}"`),
    )
    expect(achados).toEqual([])
  })

  it('[UNITÁRIO] todo @blur passa por validarAoSair (direto ou função …AoSair/sair…) ou só repassa o evento', () => {
    const achados = componentes.flatMap(({ arquivo, fonte }) =>
      [...fonte.matchAll(MANIPULADOR_BLUR)]
        .map((achado) => (achado[1] ?? '').trim())
        .filter((manipulador) => !MANIPULADOR_PERMITIDO.test(manipulador))
        .map((manipulador) => `${arquivo}: @blur="${manipulador}"`),
    )
    expect(achados).toEqual([])
  })

  it('[UNITÁRIO] formulários com useFormulario usam validarAoSair e revalidarAoDigitar', () => {
    const formularios = componentes.filter(({ fonte }) => fonte.includes('useFormulario('))
    expect(formularios.length).toBeGreaterThan(10)
    const incompletos = formularios
      .filter(({ fonte }) => !fonte.includes('validarAoSair') || !fonte.includes('revalidarAoDigitar'))
      .map(({ arquivo }) => arquivo)
    expect(incompletos).toEqual([])
  })
})

describe('clique perdido', () => {
  function montarFormulario() {
    const envios = ref(0)
    const Formulario = defineComponent({
      setup() {
        const formulario = useFormulario({ nome: '' }, { nome: [obrigatorio] })
        function enviar() {
          envios.value += 1
          formulario.validar()
        }
        return () =>
          h('form', { novalidate: true, onSubmit: (evento: Event) => (evento.preventDefault(), enviar()) }, [
            h(
              CampoFormulario,
              { rotulo: 'Nome', idCampo: 'nome', obrigatorio: true, erro: formulario.erros.nome ?? null },
              {
                default: ({ descritoPor }: { descritoPor?: string }) =>
                  h('input', {
                    id: 'nome',
                    value: formulario.valores.nome,
                    'aria-describedby': descritoPor,
                    onInput: (evento: Event) => {
                      formulario.valores.nome = (evento.target as HTMLInputElement).value
                      formulario.revalidarAoDigitar('nome')
                    },
                    onBlur: () => formulario.validarAoSair('nome'),
                  }),
              },
            ),
            h('button', { type: 'submit', 'data-teste': 'enviar' }, 'Salvar'),
          ])
      },
    })
    return { wrapper: mount(Formulario, { attachTo: document.body }), envios }
  }

  it('[COMPONENTE] sair de campo obrigatório vazio não renderiza erro e o primeiro clique em Salvar envia', async () => {
    const { wrapper, envios } = montarFormulario()
    const campo = wrapper.get('#nome')
    const botao = wrapper.get('[data-teste="enviar"]')

    ;(campo.element as HTMLInputElement).focus()
    await botao.trigger('mousedown')
    await campo.trigger('blur')
    expect(wrapper.find('[data-teste="erro-campo"]').exists()).toBe(false)

    await botao.trigger('click')
    expect(envios.value).toBe(1)
    expect(wrapper.get('[data-teste="erro-campo"]').text()).toBeTruthy()
    wrapper.unmount()
  })

  it('[COMPONENTE] depois da tentativa, sair revalida e digitar um valor válido limpa o erro', async () => {
    const { wrapper } = montarFormulario()
    await wrapper.get('[data-teste="enviar"]').trigger('click')
    expect(wrapper.find('[data-teste="erro-campo"]').exists()).toBe(true)

    await wrapper.get('#nome').setValue('Ana')
    expect(wrapper.find('[data-teste="erro-campo"]').exists()).toBe(false)

    await wrapper.get('#nome').setValue('')
    expect(wrapper.find('[data-teste="erro-campo"]').exists()).toBe(false)
    await wrapper.get('#nome').trigger('blur')
    expect(wrapper.find('[data-teste="erro-campo"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
