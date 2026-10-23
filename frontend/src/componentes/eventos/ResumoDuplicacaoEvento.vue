<script setup lang="ts">
import { computed } from 'vue'
import Skeleton from 'primevue/skeleton'

import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import { vocabularioDoTipo } from '@/textos/tiposEvento'
import type { PreviaDuplicacaoDto } from '@/tipos/duplicacaoEvento'
import type { TipoEvento } from '@/tipos/eventos'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'

interface ModulosLevados {
  tarefas: boolean
  fornecedores: boolean
  cronograma: boolean
}

interface LinhaModulo {
  chave: 'tarefas' | 'fornecedores' | 'cronograma'
  termo: string
  valor: string
  levado: boolean
  apoios: { chave: string; texto: string; alerta: boolean }[]
}

const props = defineProps<{
  tipo: TipoEvento
  data: string | null
  previa: PreviaDuplicacaoDto | null
  leva: ModulosLevados
}>()

const vocabulario = computed(() => vocabularioDoTipo(props.tipo))

function valorModulo(quantidade: number, levado: boolean, vao: (quantidade: number) => string): string {
  if (quantidade === 0) {
    return TEXTOS_DUPLICACAO_EVENTO.nadaParaLevar
  }
  return levado ? vao(quantidade) : TEXTOS_DUPLICACAO_EVENTO.naoVao
}

const linhas = computed<LinhaModulo[] | null>(() => {
  const previa = props.previa
  if (!previa) {
    return null
  }
  const atrasadas = props.leva.tarefas && props.data && previa.tarefasNascemAtrasadas > 0 ? previa.tarefasNascemAtrasadas : 0
  return [
    {
      chave: 'tarefas',
      termo: TEXTOS_DUPLICACAO_EVENTO.resumoTarefas,
      valor: valorModulo(previa.tarefas, props.leva.tarefas, TEXTOS_DUPLICACAO_EVENTO.vaoTarefas),
      levado: props.leva.tarefas && previa.tarefas > 0,
      apoios: [
        ...(previa.tarefasCanceladasIgnoradas > 0
          ? [{ chave: 'canceladas', texto: TEXTOS_DUPLICACAO_EVENTO.canceladasDeFora(previa.tarefasCanceladasIgnoradas), alerta: false }]
          : []),
        ...(atrasadas > 0 ? [{ chave: 'atrasadas', texto: TEXTOS_DUPLICACAO_EVENTO.atrasadasCurto(atrasadas), alerta: true }] : []),
      ],
    },
    {
      chave: 'fornecedores',
      termo: TEXTOS_DUPLICACAO_EVENTO.resumoFornecedores,
      valor: valorModulo(previa.fornecedores, props.leva.fornecedores, TEXTOS_DUPLICACAO_EVENTO.vaoFornecedores),
      levado: props.leva.fornecedores && previa.fornecedores > 0,
      apoios:
        previa.fornecedoresIgnorados > 0
          ? [{ chave: 'ignorados', texto: TEXTOS_DUPLICACAO_EVENTO.ignoradosDeFora(previa.fornecedoresIgnorados), alerta: false }]
          : [],
    },
    {
      chave: 'cronograma',
      termo: TEXTOS_DUPLICACAO_EVENTO.resumoCronograma,
      valor: valorModulo(previa.itensCronograma ?? 0, props.leva.cronograma, TEXTOS_DUPLICACAO_EVENTO.vaoItensCronograma),
      levado: props.leva.cronograma && (previa.itensCronograma ?? 0) > 0,
      apoios: [],
    },
  ]
})

const MODULOS = [
  { chave: 'tarefas', termo: TEXTOS_DUPLICACAO_EVENTO.resumoTarefas },
  { chave: 'fornecedores', termo: TEXTOS_DUPLICACAO_EVENTO.resumoFornecedores },
  { chave: 'cronograma', termo: TEXTOS_DUPLICACAO_EVENTO.resumoCronograma },
] as const
</script>

<template>
  <section
    class="resumo-duplicacao pilha pilha--grupo"
    aria-labelledby="titulo-resumo-duplicacao"
    data-teste="resumo-duplicacao"
  >
    <h2
      id="titulo-resumo-duplicacao"
      class="resumo-duplicacao__titulo"
    >
      {{ TEXTOS_DUPLICACAO_EVENTO.resumoTitulo }}
    </h2>
    <dl class="resumo-duplicacao__lista">
      <div
        class="resumo-duplicacao__linha"
        data-teste="resumo-tipo"
      >
        <dt class="texto-rotulo">
          {{ TEXTOS_DUPLICACAO_EVENTO.resumoTipo }}
        </dt>
        <dd class="resumo-duplicacao__descricao">
          <span class="resumo-duplicacao__valor">{{ vocabulario.rotulo }}</span>
          <span class="resumo-duplicacao__apoio">{{ TEXTOS_DUPLICACAO_EVENTO.resumoTipoDetalhe }}</span>
        </dd>
      </div>
      <div
        class="resumo-duplicacao__linha"
        data-teste="resumo-data"
      >
        <dt class="texto-rotulo">
          {{ TEXTOS_DUPLICACAO_EVENTO.resumoData }}
        </dt>
        <dd class="resumo-duplicacao__descricao">
          <span
            v-if="data"
            class="resumo-duplicacao__valor numeros-tabulares"
          >{{ formatarDataCalendarioCurta(data) }}</span>
          <span
            v-else
            class="resumo-duplicacao__apoio"
          >{{ TEXTOS_DUPLICACAO_EVENTO.semData }}</span>
        </dd>
      </div>
      <template v-if="linhas">
        <div
          v-for="linha in linhas"
          :key="linha.chave"
          class="resumo-duplicacao__linha"
          :data-teste="`resumo-${linha.chave}`"
        >
          <dt class="texto-rotulo">
            {{ linha.termo }}
          </dt>
          <dd class="resumo-duplicacao__descricao">
            <span
              class="resumo-duplicacao__valor"
              :class="{ 'resumo-duplicacao__valor--fora': !linha.levado }"
            >{{ linha.valor }}</span>
            <span
              v-for="apoio in linha.apoios"
              :key="apoio.chave"
              class="resumo-duplicacao__apoio"
              :class="{ 'resumo-duplicacao__apoio--alerta': apoio.alerta }"
              :data-teste="`resumo-${linha.chave}-${apoio.chave}`"
            >{{ apoio.texto }}</span>
          </dd>
        </div>
      </template>
      <template v-else>
        <div
          v-for="modulo in MODULOS"
          :key="modulo.chave"
          class="resumo-duplicacao__linha"
          :data-teste="`resumo-${modulo.chave}`"
        >
          <dt class="texto-rotulo">
            {{ modulo.termo }}
          </dt>
          <dd class="resumo-duplicacao__descricao">
            <span class="somente-leitor-tela">{{ TEXTOS_DUPLICACAO_EVENTO.resumoCalculando }}</span>
            <Skeleton
              width="8ch"
              height="1em"
              aria-hidden="true"
            />
          </dd>
        </div>
      </template>
    </dl>
  </section>
</template>

<style scoped>
.resumo-duplicacao {
  min-width: 0;
}

.resumo-duplicacao__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.resumo-duplicacao__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  margin: 0;
}

.resumo-duplicacao__linha {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.resumo-duplicacao__descricao {
  display: flex;
  flex-direction: column;
  margin: 0;
  min-width: 0;
}

.resumo-duplicacao__valor {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.resumo-duplicacao__valor--fora {
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.resumo-duplicacao__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.resumo-duplicacao__apoio--alerta {
  color: var(--p-cor-alerta-texto);
}
</style>
