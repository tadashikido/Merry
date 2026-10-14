<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import BadgeStatus from './BadgeStatus.vue'
import { TEXTOS_PARCELA } from '@/textos/financeiro'
import type { SituacaoParcela } from '@/tipos/financeiro'
import {
  formatarDataCalendarioCurta,
  formatarDataCalendarioExtenso,
  formatarMoeda,
} from '@/utilitarios/formatacao'
import { descreverSituacao } from '@/utilitarios/financeiro'

const props = withDefaults(
  defineProps<{
    nomeEmpresa: string
    numero: number
    total: number
    valor: number
    vencimento: string
    situacao: SituacaoParcela
    diasParaVencimento: number
    venceEmBreve?: boolean
    pagaEm?: string | null
    observacao?: string | null
    possuiComprovante?: boolean
    nomesCasal?: string | null
    compacta?: boolean
    historico?: boolean
    destino?: RouteLocationRaw | null
  }>(),
  {
    venceEmBreve: false,
    pagaEm: null,
    observacao: null,
    possuiComprovante: false,
    nomesCasal: null,
    compacta: false,
    historico: false,
    destino: null,
  },
)

function dataSemAno(valor: string): string {
  return formatarDataCalendarioCurta(valor).split(' ').slice(0, 2).join(' ')
}

const partesData = computed(() => {
  const [dia = '', mes = ''] = formatarDataCalendarioCurta(props.vencimento).split(' ')
  return { dia, mes }
})

const descricao = computed(() => descreverSituacao(props, dataSemAno))
const titulo = computed(() => TEXTOS_PARCELA.numero(props.nomeEmpresa, props.numero, props.total))
const apoio = computed(() => [props.nomesCasal, props.observacao].filter((parte): parte is string => Boolean(parte)).join(' · '))
const tom = computed(() => {
  if (props.historico) {
    return 'historico'
  }
  if (props.situacao === 'Vencida') {
    return 'vencida'
  }
  if (props.situacao === 'Paga') {
    return 'paga'
  }
  return props.venceEmBreve ? 'breve' : 'pendente'
})
</script>

<template>
  <li
    class="linha-parcela"
    :class="[`linha-parcela--${tom}`, { 'linha-parcela--compacta': compacta }]"
    data-teste="linha-parcela"
  >
    <component
      :is="destino ? RouterLink : 'div'"
      class="linha-parcela__corpo"
      :class="{ 'linha-parcela__corpo--link': destino }"
      v-bind="destino ? { to: destino } : {}"
    >
      <span
        class="linha-parcela__data numeros-tabulares"
        aria-hidden="true"
      >
        <span class="linha-parcela__dia">{{ partesData.dia }}</span>
        <span class="linha-parcela__mes">{{ partesData.mes }}</span>
      </span>
      <span class="linha-parcela__texto">
        <span
          class="linha-parcela__titulo"
          data-teste="parcela-titulo"
        >{{ titulo }}</span>
        <span class="somente-leitor-tela">, {{ TEXTOS_PARCELA.vencimentoAria(formatarDataCalendarioExtenso(vencimento)) }}</span>
        <span
          v-if="apoio || possuiComprovante"
          class="linha-parcela__apoio"
        >
          <span v-if="apoio">{{ apoio }}</span>
          <span
            v-if="possuiComprovante"
            class="linha-parcela__comprovante"
            data-teste="parcela-comprovante"
          >
            <span
              class="ie ie-documento"
              aria-hidden="true"
            />
            {{ TEXTOS_PARCELA.comprovante }}
          </span>
        </span>
      </span>
      <span
        class="linha-parcela__valor numeros-tabulares"
        data-teste="parcela-valor"
      >{{ formatarMoeda(valor) }}</span>
      <span class="linha-parcela__situacao">
        <BadgeStatus
          :texto="descricao.texto"
          :variante="historico ? 'neutro' : descricao.variante"
          data-teste="parcela-situacao"
        />
      </span>
    </component>
    <div
      v-if="$slots.acoes"
      class="linha-parcela__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.linha-parcela {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-3) var(--p-espaco-4);
  list-style: none;
}

.linha-parcela + .linha-parcela {
  border-top: 1px solid var(--p-cor-divisoria);
}

.linha-parcela__corpo {
  display: grid;
  flex: 1;
  grid-template-columns: var(--p-espaco-10) minmax(0, 1fr) auto;
  grid-template-areas:
    'data texto valor'
    'data situacao situacao';
  align-items: center;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  min-width: 0;
  min-height: var(--p-dimensao-alvo-toque-movel);
  color: var(--p-cor-texto);
  text-decoration: none;
}

.linha-parcela__corpo--link {
  border-radius: var(--p-raio-controle);
}

.linha-parcela__corpo--link:hover .linha-parcela__titulo {
  color: var(--p-cor-primaria);
  text-decoration: underline;
}

.linha-parcela__data {
  display: flex;
  grid-area: data;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.linha-parcela__dia {
  font-family: var(--p-fonte-editorial);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-seminegrito);
  font-variant-numeric: lining-nums tabular-nums;
}

.linha-parcela__mes {
  margin-top: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-rotulo);
  color: var(--p-cor-texto-apoio);
}

.linha-parcela--vencida .linha-parcela__dia {
  color: var(--p-cor-erro-texto);
}

.linha-parcela--breve .linha-parcela__dia {
  color: var(--p-cor-alerta-texto);
}

.linha-parcela--paga .linha-parcela__dia,
.linha-parcela--historico .linha-parcela__dia {
  color: var(--p-cor-texto-apoio);
}

.linha-parcela__texto {
  display: flex;
  grid-area: texto;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.linha-parcela__titulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  overflow-wrap: anywhere;
}

.linha-parcela__apoio {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.linha-parcela__comprovante {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-1);
}

.linha-parcela__valor {
  grid-area: valor;
  justify-self: end;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  white-space: nowrap;
}

.linha-parcela--historico .linha-parcela__valor,
.linha-parcela--historico .linha-parcela__titulo {
  color: var(--p-cor-texto-apoio);
}

.linha-parcela__situacao {
  grid-area: situacao;
}

.linha-parcela__acoes {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.linha-parcela--compacta {
  padding: var(--p-espaco-2) 0;
}

@media (min-width: 640px) {
  .linha-parcela__corpo {
    grid-template-columns: var(--p-espaco-10) minmax(0, 1fr) auto minmax(var(--p-espaco-16), auto);
    grid-template-areas: 'data texto valor situacao';
    min-height: var(--p-dimensao-alvo-toque);
  }

  .linha-parcela__situacao {
    justify-self: end;
  }
}
</style>
