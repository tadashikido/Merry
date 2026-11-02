import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import PagamentosPorMes from '@/componentes/financeiro/PagamentosPorMes.vue'
import { referenciaDoEvento } from '@/textos/convidados'
import { TEXTOS_PAGAMENTOS_MES } from '@/textos/financeiro'
import { TEXTOS_ATUACAO_FORNECEDOR } from '@/textos/fornecedores'
import { REFERENCIA_QUALQUER_EVENTO } from '@/textos/modelos'
import { TEXTOS_MODELOS_CRONOGRAMA, dicasModeloCronograma, rotuloLocalModelo } from '@/textos/modelosCronograma'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import { montarLocaisOperacao } from '@/utilitarios/cronogramaPublico'
import { aproximarDias, descreverPrazoAproximado } from '@/utilitarios/prazoModelo'

const RAIZ = resolve(__dirname, '../..')

function listarCodigo(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) {
      return nome === '__tests__' || nome === 'desenvolvimento' ? [] : listarCodigo(caminho)
    }
    return /\.(vue|ts)$/.test(nome) ? [caminho] : []
  })
}

function ler(caminhoRelativo: string): string {
  return readFileSync(resolve(RAIZ, caminhoRelativo), 'utf-8')
}

describe('nenhum fallback para Casamento', () => {
  it('[UNITÁRIO] código não usa vocabularioDoTipo nem cai em Casamento como padrão de tipo', () => {
    const achados = listarCodigo(RAIZ).flatMap((caminho) => {
      const arquivo = relative(RAIZ, caminho).split('\\').join('/')
      const texto = readFileSync(caminho, 'utf-8')
      const proibidos = [/vocabularioDoTipo/, /\?\s*tipo\s*:\s*'Casamento'/, /\?\?\s*'Casamento'/, /VOCABULARIO_TIPO_EVENTO\.Casamento/]
      return proibidos.filter((regra) => regra.test(texto)).map((regra) => `${arquivo}: ${regra}`)
    })
    expect(achados).toEqual([])
  })

  it('[UNITÁRIO] tela de aceite do anfitrião usa o vocabulário neutro', () => {
    expect(ler('views/autenticacao/AceiteAcessoAnfitriaoView.vue')).toContain('vocabularioOuNeutro(convite.value?.tipo)')
  })

  it('[UNITÁRIO] locais do Grande Dia em tipo desconhecido usam rótulos neutros', () => {
    const locais = montarLocaisOperacao({ tipo: 'Formatura' as TipoEvento, horarioCerimonia: null, localCerimonia: 'Salão', localRecepcao: 'Bar' })
    expect(locais.map((local) => local.rotulo)).toEqual([
      VOCABULARIO_TIPO_EVENTO.Comemoracao.locais.principal,
      VOCABULARIO_TIPO_EVENTO.Comemoracao.locais.secundario,
    ])
    expect(JSON.stringify(locais)).not.toMatch(/cerimônia|recepção/i)
  })

  it('[UNITÁRIO] Grande Dia monta a frase do momento pela mesma função do cronograma público', () => {
    const fonte = ler('views/grandeDia/GrandeDiaView.vue')
    expect(fonte).toContain('fraseMomentoDoCronograma(')
    expect(fonte).not.toContain('TEXTOS_GRANDE_DIA.momentoComeca(')
  })
})

describe('textos ajustados', () => {
  it.each([
    [21, '3 semanas antes da comemoração'],
    [25, 'Cerca de 1 mês antes da comemoração'],
    [28, '4 semanas antes da comemoração'],
    [30, 'Cerca de 1 mês antes da comemoração'],
    [45, 'Cerca de 2 meses antes da comemoração'],
  ] as const)('[UNITÁRIO] prazo de %i dias vira "%s"', (dias, esperado) => {
    expect(descreverPrazoAproximado(dias, 'da comemoração')).toBe(esperado)
  })

  it('[UNITÁRIO] semanas não exatas a partir de 4 viram meses', () => {
    expect(aproximarDias(30)).toMatchObject({ unidade: 'mes', quantidade: 1 })
    expect(aproximarDias(-26)).toMatchObject({ unidade: 'mes', quantidade: 1 })
    expect(aproximarDias(20)).toMatchObject({ unidade: 'semana', quantidade: 3 })
  })

  it('[UNITÁRIO] "o evento" vem de uma única referência', () => {
    expect(referenciaDoEvento(null)).toBe(REFERENCIA_QUALQUER_EVENTO.artigo)
    expect(referenciaDoEvento('Formatura' as TipoEvento)).toBe(REFERENCIA_QUALQUER_EVENTO.artigo)
    expect(referenciaDoEvento('QuinzeAnos')).toBe(VOCABULARIO_TIPO_EVENTO.QuinzeAnos.referencia.artigo)
  })

  it('[UNITÁRIO] atuação sem tipo não chama todo evento de arquivado', () => {
    expect(TEXTOS_ATUACAO_FORNECEDOR.semTipo(1)).toBe('1 em evento arquivado ou sem tipo identificado')
    expect(TEXTOS_ATUACAO_FORNECEDOR.semTipo(3)).toBe('3 em eventos arquivados ou sem tipo identificado')
  })

  it.each([null, 'Aniversario', 'Comemoracao', 'QuinzeAnos'] as const)(
    '[UNITÁRIO] opção de local livre (%s) não colide com "Outro local"',
    (tipo) => {
      const rotulos = (['Cerimonia', 'Recepcao', 'Outro'] as const).map((opcao) => rotuloLocalModelo(opcao, tipo))
      expect(rotulos[2]).toBe('Escrever o local')
      expect(new Set(rotulos).size).toBe(3)
    },
  )

  it('[UNITÁRIO] dica do modelo de cronograma diz que os itens se editam no detalhe', () => {
    expect(dicasModeloCronograma('Casamento')[1]).toMatch(/^Os itens se editam no detalhe do modelo/)
    expect(TEXTOS_MODELOS_CRONOGRAMA.recurso).toBeTruthy()
  })

  it('[COMPONENTE] Financeiro diz "Nada vence até a data" quando tudo vence depois do evento', () => {
    const wrapper = mount(PagamentosPorMes, {
      props: {
        tipo: 'Aniversario',
        dataEvento: '2026-11-20',
        parcelas: [{ valor: 3500, vencimento: '2026-12-10', situacao: 'Pendente' }],
      },
    })
    expect(wrapper.text()).toContain(TEXTOS_PAGAMENTOS_MES.nadaAteEvento('do aniversário'))
    expect(wrapper.text()).not.toMatch(/R\$\s*0,00 até/)
    expect(wrapper.text()).toContain('depois dela')
  })
})

describe('acessibilidade dos campos', () => {
  function montarCampo(props: Record<string, unknown>) {
    return mount(
      defineComponent({
        setup: () => () =>
          h(
            CampoFormulario,
            { rotulo: 'Categoria', idCampo: 'campo', ...props },
            { default: ({ descritoPor }: { descritoPor?: string }) => h('input', { id: 'campo', 'aria-describedby': descritoPor }) },
          ),
      }),
    )
  }

  it('[COMPONENTE] descrições extras somam-se à dica e ao erro no aria-describedby', () => {
    expect(montarCampo({ dica: 'Dica', descricoesExtras: 'apoio-1' }).get('input').attributes('aria-describedby')).toBe('campo-dica apoio-1')
    expect(montarCampo({ dica: 'Dica', erro: 'Erro', descricoesExtras: 'apoio-1' }).get('input').attributes('aria-describedby')).toBe(
      'campo-erro apoio-1',
    )
    expect(montarCampo({ descricoesExtras: 'apoio-1' }).get('input').attributes('aria-describedby')).toBe('apoio-1')
    expect(montarCampo({}).get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('[UNITÁRIO] selects com opção nula mostram o rótulo dela como placeholder', () => {
    expect(ler('views/modelosCronograma/ItemModeloCronogramaFormularioView.vue')).toContain(
      ':placeholder="TEXTOS_ITEM_MODELO_CRONOGRAMA.nenhumaCategoria"',
    )
    expect(ler('componentes/cronograma/DialogoItemCronograma.vue')).toContain(':placeholder="TEXTOS_CRONOGRAMA.nenhumFornecedor"')
  })

  it('[UNITÁRIO] RSVP largo não repete os locais do cartão (ficam em Como chegar)', () => {
    const fonte = ler('views/rsvp/RsvpView.vue')
    const bloco = fonte.slice(fonte.indexOf('@container rsvp (min-width: 56rem)'))
    expect(bloco).toMatch(/\.rsvp__coluna-convite :deep\(\.cabecalho-convite__locais\)\s*\{\s*display: none;/)
  })
})
