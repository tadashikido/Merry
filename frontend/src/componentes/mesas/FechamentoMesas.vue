<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_FECHAMENTO_MESAS as TEXTOS } from '@/textos/mesas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import type { MapaMesasDto } from '@/tipos/mesas'
import { formatarNumero } from '@/utilitarios/formatacao'
import { rotuloMesa, situacaoFechamentoMesas } from '@/utilitarios/mesas'

const props = defineProps<{
  mapa: Pick<MapaMesasDto, 'mesas' | 'pessoas' | 'totais'>
  tipo: TipoEvento | null
  pendentes: number | null
  arquivado: boolean
}>()

const idTitulo = `fechamento-mesas-${useId()}`

const termoEspecial = computed(() => vocabularioOuNeutro(props.tipo).mesaEspecial)
const situacao = computed(() => situacaoFechamentoMesas(props.mapa, props.pendentes))

const frase = computed(() => {
  const atual = situacao.value
  if (atual.confirmados === 0) {
    return TEXTOS.semConfirmados(atual.lugares)
  }
  if (props.mapa.mesas.length === 0) {
    return TEXTOS.semMesas(atual.confirmados)
  }
  if (atual.faltamLugares > 0) {
    return TEXTOS.faltam(atual.faltamLugares)
  }
  if (atual.semMesa > 0) {
    return TEXTOS.bastam(atual.semMesa)
  }
  return TEXTOS.todosSentados(atual.sobramLugares)
})

const projecao = computed(() => {
  const faltariam = situacao.value.faltariamSeTodosVierem
  if (faltariam === null || props.mapa.mesas.length === 0) {
    return null
  }
  return faltariam > 0 ? TEXTOS.faltariam(faltariam) : TEXTOS.cabem
})

const observacoes = computed(() => {
  const atual = situacao.value
  const itens: { chave: string; texto: string }[] = []
  const especial = atual.mesaEspecial
  if (especial) {
    itens.push({
      chave: 'especial',
      texto: especial.nome
        ? TEXTOS.especialDefinidaComNome(termoEspecial.value, rotuloMesa(especial, termoEspecial.value), especial.ocupacao, especial.capacidade)
        : TEXTOS.especialDefinida(termoEspecial.value, especial.ocupacao, especial.capacidade),
    })
  } else if (!props.arquivado && props.mapa.mesas.length > 0) {
    itens.push({ chave: 'especial-ausente', texto: TEXTOS.especialAusente(termoEspecial.value) })
  }
  if (atual.completas > 0) {
    itens.push({ chave: 'completas', texto: TEXTOS.completas(atual.completas) })
  }
  if (atual.vazias > 0) {
    itens.push({ chave: 'vazias', texto: TEXTOS.vazias(atual.vazias) })
  }
  if (atual.criancasSemMesa > 0) {
    itens.push({ chave: 'criancas', texto: TEXTOS.criancas(atual.criancasSemMesa) })
  }
  if (atual.convitesDivididos > 0) {
    itens.push({ chave: 'divididos', texto: TEXTOS.divididos(atual.convitesDivididos) })
  }
  return itens
})
</script>

<template>
  <section
    class="fechamento-mesas"
    :aria-labelledby="idTitulo"
    data-teste="fechamento-mesas"
  >
    <div class="fechamento-mesas__corpo">
      <div class="fechamento-mesas__situacao pilha pilha--grupo">
        <h2
          :id="idTitulo"
          class="fechamento-mesas__titulo"
        >
          {{ TEXTOS.titulo }}
        </h2>

        <p
          class="fechamento-mesas__frase"
          data-teste="fechamento-frase"
        >
          {{ frase }}
        </p>

        <ul
          class="fechamento-mesas__numeros"
          :class="{ 'fechamento-mesas__numeros--tres': situacao.maximo !== null }"
          :aria-label="TEXTOS.numerosRotulo"
        >
          <li
            class="fechamento-mesas__numero-item"
            data-teste="fechamento-lugares"
          >
            <span
              class="fechamento-mesas__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.lugares) }}</span>
            <span
              class="fechamento-mesas__legenda"
              aria-hidden="true"
            >{{ TEXTOS.lugares(situacao.lugares) }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS.lugaresAcessivel(situacao.lugares) }}</span>
          </li>
          <li
            class="fechamento-mesas__numero-item"
            data-teste="fechamento-confirmados"
          >
            <span
              class="fechamento-mesas__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.confirmados) }}</span>
            <span
              class="fechamento-mesas__legenda"
              aria-hidden="true"
            >{{ TEXTOS.confirmados(situacao.confirmados) }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS.confirmadosAcessivel(situacao.confirmados) }}</span>
          </li>
          <li
            v-if="situacao.maximo !== null"
            class="fechamento-mesas__numero-item"
            data-teste="fechamento-maximo"
          >
            <span
              class="fechamento-mesas__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.maximo) }}</span>
            <span
              class="fechamento-mesas__legenda"
              aria-hidden="true"
            >{{ TEXTOS.maximo }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS.maximoAcessivel(situacao.maximo) }}</span>
          </li>
        </ul>

        <p
          v-if="projecao"
          class="fechamento-mesas__nota"
          data-teste="fechamento-projecao"
        >
          {{ projecao }}
        </p>
      </div>

      <ul
        v-if="observacoes.length > 0"
        class="fechamento-mesas__observacoes"
        :aria-label="TEXTOS.observacoesRotulo"
      >
        <li
          v-for="item in observacoes"
          :key="item.chave"
          class="fechamento-mesas__observacao"
          :data-teste="`fechamento-${item.chave}`"
        >
          {{ item.texto }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.fechamento-mesas {
  container: fechamento-mesas / inline-size;
  min-width: 0;
  padding: var(--p-ritmo-cartao);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.fechamento-mesas__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.fechamento-mesas__situacao {
  min-width: 0;
}

.fechamento-mesas__titulo,
.fechamento-mesas__frase,
.fechamento-mesas__nota {
  margin: 0;
}

.fechamento-mesas__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  color: var(--p-cor-texto);
}

.fechamento-mesas__frase {
  padding-inline-start: var(--p-ritmo-campo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: 1.35;
  color: var(--p-cor-texto);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.fechamento-mesas__numeros {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.fechamento-mesas__numeros--tres {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.fechamento-mesas__numero-item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.fechamento-mesas__numero-item + .fechamento-mesas__numero-item {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 1px solid var(--p-cor-divisoria);
}

.fechamento-mesas__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-texto);
}

.fechamento-mesas__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  line-height: 1.2;
  color: var(--p-cor-texto-secundario);
  overflow-wrap: break-word;
}

.fechamento-mesas__nota {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.fechamento-mesas__observacoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  align-self: start;
  margin: 0;
  padding: 0;
  padding-inline-start: var(--p-ritmo-campo);
  list-style: none;
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.fechamento-mesas__observacao {
  min-width: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto);
}

@container fechamento-mesas (min-width: 36rem) {
  .fechamento-mesas__corpo {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }

  .fechamento-mesas__observacoes {
    margin-block-start: calc(var(--p-fonte-tamanho-secao) * 1.6);
  }
}
</style>
