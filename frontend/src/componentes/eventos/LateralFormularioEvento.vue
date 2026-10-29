<script setup lang="ts">
import { computed, onMounted } from 'vue'

import LateralOrientacao from '@/componentes/base/LateralOrientacao.vue'
import type { ItemOrientacaoAcesso } from '@/componentes/base/OrientacaoAcesso.vue'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { TEXTOS_FORMULARIO_EVENTO } from '@/textos/eventos'
import { classeTomDoTipo, vocabularioDoTipo } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import { modelosDoTipo, type ModeloComTipo } from '@/utilitarios/modelosPorTipo'

interface ModeloResumido extends ModeloComTipo {
  id: string
  nome: string
  sugerido: boolean
  quantidadeItens: number
}

interface ResumoModelos {
  principal: ModeloResumido | null
  outros: number
}

const props = defineProps<{ tipo: TipoEvento; mostrarModelos: boolean }>()

const modelosChecklist = useModelosChecklistStore()
const modelosCronograma = useModelosCronogramaStore()

const vocabulario = computed(() => vocabularioDoTipo(props.tipo))

const itensOrientacao = computed<ItemOrientacaoAcesso[]>(() => [
  {
    chave: 'costuma-ter',
    titulo: TEXTOS_FORMULARIO_EVENTO.costumaTer,
    texto: vocabulario.value.comoCostumaSer,
    teste: 'orientacao-costuma-ter',
  },
  {
    chave: 'homenageados',
    titulo: vocabulario.value.homenageados.grupo,
    texto: TEXTOS_FORMULARIO_EVENTO.usoHomenageados,
    teste: 'orientacao-homenageados',
  },
  {
    chave: 'horario',
    titulo: vocabulario.value.horario,
    texto: TEXTOS_FORMULARIO_EVENTO.usoHorario,
    teste: 'orientacao-horario',
  },
  {
    chave: 'local',
    titulo: vocabulario.value.locais.campoPrincipal,
    texto: TEXTOS_FORMULARIO_EVENTO.usoLocal,
    teste: 'orientacao-local',
  },
])

function resumir(lista: readonly ModeloResumido[] | null): ResumoModelos | null {
  if (!lista) {
    return null
  }
  const disponiveis = modelosDoTipo(lista, props.tipo)
  const principal = disponiveis.find((modelo) => modelo.sugerido) ?? disponiveis[0] ?? null
  return { principal, outros: principal ? disponiveis.length - 1 : 0 }
}

const resumoChecklist = computed(() => (props.mostrarModelos ? resumir(modelosChecklist.lista) : null))
const resumoCronograma = computed(() => (props.mostrarModelos ? resumir(modelosCronograma.lista) : null))
const temModelos = computed(() => resumoChecklist.value !== null || resumoCronograma.value !== null)

const linhasModelos = computed(() =>
  [
    {
      chave: 'checklist',
      termo: TEXTOS_FORMULARIO_EVENTO.checklist,
      resumo: resumoChecklist.value,
      quantidade: TEXTOS_FORMULARIO_EVENTO.tarefas,
      vazio: TEXTOS_FORMULARIO_EVENTO.semModeloChecklist,
    },
    {
      chave: 'cronograma',
      termo: TEXTOS_FORMULARIO_EVENTO.cronograma,
      resumo: resumoCronograma.value,
      quantidade: TEXTOS_FORMULARIO_EVENTO.itens,
      vazio: TEXTOS_FORMULARIO_EVENTO.semModeloCronograma,
    },
  ].filter((linha) => linha.resumo !== null),
)

onMounted(() => {
  if (!props.mostrarModelos) {
    return
  }
  if (modelosChecklist.lista === null && !modelosChecklist.carregandoLista) {
    void modelosChecklist.listar()
  }
  if (modelosCronograma.lista === null && !modelosCronograma.carregandoLista) {
    void modelosCronograma.listar()
  }
})
</script>

<template>
  <div
    class="lateral-formulario-evento pilha pilha--cartao"
    :class="classeTomDoTipo(tipo)"
    data-teste="lateral-formulario-evento"
  >
    <LateralOrientacao
      id-titulo="titulo-orientacao-tipo-evento"
      :rotulo="vocabulario.rotulo"
      :titulo="TEXTOS_FORMULARIO_EVENTO.orientacaoTitulo(vocabulario.referencia.artigo)"
      :itens="itensOrientacao"
      data-teste="orientacao-tipo-evento"
    />

    <section
      v-if="temModelos"
      class="lateral-formulario-evento__modelos cartao pilha pilha--grupo"
      aria-labelledby="titulo-modelos-para-comecar"
      data-teste="modelos-para-comecar"
    >
      <h2
        id="titulo-modelos-para-comecar"
        class="lateral-formulario-evento__titulo"
      >
        {{ TEXTOS_FORMULARIO_EVENTO.modelosTitulo }}
      </h2>
      <p class="lateral-formulario-evento__texto">
        {{ TEXTOS_FORMULARIO_EVENTO.modelosTexto(vocabulario.referencia.contracaoDe) }}
      </p>
      <dl class="lateral-formulario-evento__lista">
        <div
          v-for="linha in linhasModelos"
          :key="linha.chave"
          class="lateral-formulario-evento__linha"
          :data-teste="`modelo-${linha.chave}`"
        >
          <dt class="texto-rotulo">
            {{ linha.termo }}
          </dt>
          <dd
            v-if="linha.resumo?.principal"
            class="lateral-formulario-evento__descricao"
          >
            <span class="lateral-formulario-evento__nome">{{ linha.resumo.principal.nome }}</span>
            <span class="lateral-formulario-evento__quantidade">{{ linha.quantidade(linha.resumo.principal.quantidadeItens) }}</span>
            <span
              v-if="linha.resumo.outros > 0"
              class="lateral-formulario-evento__quantidade"
            >{{ TEXTOS_FORMULARIO_EVENTO.outrosModelos(linha.resumo.outros) }}</span>
          </dd>
          <dd
            v-else
            class="lateral-formulario-evento__descricao lateral-formulario-evento__texto"
            :data-teste="`sem-modelo-${linha.chave}`"
          >
            {{ linha.vazio }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.lateral-formulario-evento {
  min-width: 0;
}

.lateral-formulario-evento__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-titulo);
}

.lateral-formulario-evento__texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.lateral-formulario-evento__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  margin: 0;
}

.lateral-formulario-evento__linha {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.lateral-formulario-evento__descricao {
  display: flex;
  flex-direction: column;
  margin: 0;
  min-width: 0;
}

.lateral-formulario-evento__quantidade {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.lateral-formulario-evento__nome {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}
</style>
