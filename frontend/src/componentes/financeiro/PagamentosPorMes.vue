<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_PAGAMENTOS_MES } from '@/textos/financeiro'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import type { ParcelaDto } from '@/tipos/financeiro'
import { deCentavos } from '@/utilitarios/centavos'
import { projetarPagamentosPorMes } from '@/utilitarios/financeiro'
import { formatarMesAno, formatarMoeda } from '@/utilitarios/formatacao'

const props = defineProps<{
  parcelas: Pick<ParcelaDto, 'valor' | 'vencimento' | 'situacao'>[]
  dataEvento: string | null
  tipo: TipoEvento | null
}>()

const idTitulo = `pagamentos-mes-${useId()}`

const vocabulario = computed(() => vocabularioOuNeutro(props.tipo))
const projecao = computed(() => projetarPagamentosPorMes(props.parcelas, props.dataEvento))
const meses = computed(() =>
  projecao.value.meses.map((mes) => ({
    chave: mes.chave,
    rotulo: formatarMesAno(mes.chave),
    valor: formatarMoeda(deCentavos(mes.centavos)),
    parcelas: TEXTOS_PAGAMENTOS_MES.parcelas(mes.quantidade),
    proporcao: `${projecao.value.maiorCentavos > 0 ? Math.max(Math.round((mes.centavos / projecao.value.maiorCentavos) * 100), 2) : 0}%`,
    selo: mes.doEvento ? TEXTOS_PAGAMENTOS_MES.mesDoEvento(vocabulario.value.referencia.contracaoDe) : null,
  })),
)
const nota = computed(() => {
  const { ateEventoCentavos, depoisCentavos } = projecao.value
  if (ateEventoCentavos === null) {
    return null
  }
  const partes = [TEXTOS_PAGAMENTOS_MES.ateEvento(formatarMoeda(deCentavos(ateEventoCentavos)), vocabulario.value.referencia.contracaoDe)]
  if (depoisCentavos > 0) {
    partes.push(TEXTOS_PAGAMENTOS_MES.depois(formatarMoeda(deCentavos(depoisCentavos))))
  }
  return partes.join(' ')
})
const restante = computed(() =>
  projecao.value.restante.meses > 0
    ? TEXTOS_PAGAMENTOS_MES.restante(formatarMoeda(deCentavos(projecao.value.restante.centavos)), projecao.value.restante.meses)
    : null,
)
</script>

<template>
  <section
    v-if="meses.length > 0"
    class="pagamentos-mes cartao pilha pilha--grupo"
    :aria-labelledby="idTitulo"
    data-teste="pagamentos-por-mes"
  >
    <h2
      :id="idTitulo"
      class="pagamentos-mes__titulo texto-rotulo"
    >
      {{ TEXTOS_PAGAMENTOS_MES.titulo }}
    </h2>

    <p
      class="pagamentos-mes__frase"
      data-teste="pagamentos-mes-total"
    >
      <span class="pagamentos-mes__numero numeros-tabulares">{{ formatarMoeda(deCentavos(projecao.totalCentavos)) }}</span>{{ ' ' }}<span class="pagamentos-mes__legenda">{{ TEXTOS_PAGAMENTOS_MES.legenda }}</span>
    </p>

    <ol
      class="pagamentos-mes__lista"
      :aria-label="TEXTOS_PAGAMENTOS_MES.listaRotulo"
    >
      <li
        v-for="mes in meses"
        :key="mes.chave"
        class="pagamentos-mes__item"
        :class="{ 'pagamentos-mes__item--evento': mes.selo }"
        :data-teste="`mes-${mes.chave}`"
      >
        <span class="pagamentos-mes__mes">
          {{ mes.rotulo }}<span class="somente-leitor-tela">,</span>
          <span
            v-if="mes.selo"
            class="pagamentos-mes__selo"
            data-teste="mes-do-evento"
          >{{ mes.selo }}<span class="somente-leitor-tela">,</span></span>
        </span>
        <span class="pagamentos-mes__valor numeros-tabulares">{{ mes.valor }}<span class="somente-leitor-tela">,</span></span>
        <span class="pagamentos-mes__parcelas">{{ mes.parcelas }}</span>
        <span
          class="pagamentos-mes__barra"
          aria-hidden="true"
        >
          <span
            class="pagamentos-mes__preenchimento"
            :style="{ inlineSize: mes.proporcao }"
          />
        </span>
      </li>
    </ol>

    <p
      v-if="restante"
      class="pagamentos-mes__restante"
      data-teste="pagamentos-mes-restante"
    >
      {{ restante }}
    </p>

    <p
      v-if="nota"
      class="pagamentos-mes__nota"
      data-teste="pagamentos-mes-nota"
    >
      {{ nota }}
    </p>
  </section>
</template>

<style scoped>
.pagamentos-mes {
  container: pagamentos-mes / inline-size;
}

.pagamentos-mes .pagamentos-mes__titulo,
.pagamentos-mes__frase,
.pagamentos-mes__restante,
.pagamentos-mes__nota {
  margin: 0;
}

.pagamentos-mes__frase {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-espaco-2);
}

.pagamentos-mes__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-primaria);
}

.pagamentos-mes__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

.pagamentos-mes__lista {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--p-cor-divisoria);
}

.pagamentos-mes__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'mes valor'
    'barra parcelas';
  align-items: center;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  padding: var(--p-espaco-3) 0;
  border-bottom: 1px solid var(--p-cor-divisoria);
  font-size: var(--p-fonte-tamanho-controle);
}

.pagamentos-mes__item--evento {
  padding-inline-start: var(--p-espaco-3);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.pagamentos-mes__mes {
  grid-area: mes;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-espaco-2);
  min-width: 0;
  color: var(--p-cor-texto);
}

.pagamentos-mes__selo {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-primaria);
}

.pagamentos-mes__valor {
  grid-area: valor;
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  text-align: end;
}

.pagamentos-mes__parcelas {
  grid-area: parcelas;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
  text-align: end;
}

.pagamentos-mes__barra {
  grid-area: barra;
  display: block;
  height: var(--p-espaco-1);
  overflow: hidden;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-total);
}

.pagamentos-mes__preenchimento {
  display: block;
  height: 100%;
  background: var(--p-cor-primaria);
  border-radius: var(--p-raio-total);
}

.pagamentos-mes__restante,
.pagamentos-mes__nota {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

@container pagamentos-mes (min-width: 30rem) {
  .pagamentos-mes__item {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto auto;
    grid-template-areas: 'mes barra parcelas valor';
    column-gap: var(--p-espaco-4);
  }

  .pagamentos-mes__numero {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}
</style>
