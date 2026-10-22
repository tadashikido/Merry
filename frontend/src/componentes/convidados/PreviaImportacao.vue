<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import ListaProblemasLinha from '@/componentes/base/ListaProblemasLinha.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { FiltroProblemaLinha, ItemProblemaLinha, TextosListaProblemas } from '@/componentes/base/tipos'
import {
  ROTULOS_COLUNA_IMPORTACAO,
  ROTULOS_FILTRO_PROBLEMA,
  ROTULOS_TIPO_PROBLEMA,
  TEXTOS_IMPORTACAO,
  VARIANTE_TIPO_PROBLEMA,
} from '@/textos/importacaoConvidados'
import type { PreVisualizacaoImportacaoDto, TipoProblemaLinha } from '@/tipos/importacaoConvidados'
import { frasePrevia, itensResumoImportacao, linhasBloqueantes, ultrapassaLimite } from '@/utilitarios/importacaoConvidados'

const LIMITE_CONVITES = 30
const TIPOS: TipoProblemaLinha[] = ['Erro', 'Duplicado', 'Aviso']

const props = defineProps<{ previa: PreVisualizacaoImportacaoDto; nomeArquivo: string }>()

const todosConvites = ref(false)

watch(
  () => props.previa,
  () => {
    todosConvites.value = false
  },
)

const frase = computed(() => frasePrevia(props.previa))
const temBloqueantes = computed(() => linhasBloqueantes(props.previa) > 0)
const acimaDoLimite = computed(() => ultrapassaLimite(props.previa))
const temLateral = computed(
  () => props.previa.resumo.convitesValidos > 0 || acimaDoLimite.value || props.previa.colunasIgnoradas.length > 0,
)
const totalDepois = computed(() => props.previa.resumo.convidadosExistentes + props.previa.resumo.pessoasValidas)

const itensProblemas = computed<ItemProblemaLinha[]>(() =>
  props.previa.linhasComProblema.map((linha) => ({
    linha: linha.linha,
    titulo: linha.valores.nome || TEXTOS_IMPORTACAO.semNome,
    problemas: linha.problemas.map((problema) => ({
      tipo: problema.tipo,
      rotuloTipo: ROTULOS_TIPO_PROBLEMA[problema.tipo],
      variante: VARIANTE_TIPO_PROBLEMA[problema.tipo],
      campo: problema.coluna ? ROTULOS_COLUNA_IMPORTACAO[problema.coluna] : null,
      mensagem: problema.mensagem,
    })),
  })),
)

const filtrosProblemas: FiltroProblemaLinha[] = TIPOS.map((tipo) => ({ tipo, rotulo: ROTULOS_FILTRO_PROBLEMA[tipo] }))

const textosProblemas = computed<TextosListaProblemas>(() => ({
  rotulo: temBloqueantes.value ? TEXTOS_IMPORTACAO.secaoProblemas : TEXTOS_IMPORTACAO.secaoAvisos,
  filtro: TEXTOS_IMPORTACAO.filtroProblemas,
  todos: TEXTOS_IMPORTACAO.filtroTodos,
  linha: TEXTOS_IMPORTACAO.itemLinha,
  mostrarMais: TEXTOS_IMPORTACAO.mostrarMais,
  vazio: '',
}))

const convitesOrdenados = computed(() => [
  ...props.previa.convites.filter((convite) => convite.valido),
  ...props.previa.convites.filter((convite) => !convite.valido),
])
const convitesExibidos = computed(() =>
  todosConvites.value ? convitesOrdenados.value : convitesOrdenados.value.slice(0, LIMITE_CONVITES),
)
</script>

<template>
  <div
    class="previa"
    data-teste="previa-importacao"
  >
    <div
      class="previa__grade"
      :class="{ 'previa__grade--com-lateral': temLateral }"
    >
      <header class="previa__abertura">
        <p
          class="previa__frase"
          data-teste="previa-frase"
        >
          {{ frase }}
        </p>
        <p class="previa__arquivo">
          {{ TEXTOS_IMPORTACAO.linhasLidas(nomeArquivo, previa.resumo.linhas) }}
        </p>
      </header>

      <div
        v-if="temLateral"
        class="previa__lateral pilha pilha--grupo"
      >
        <ResumoContagem
          v-if="previa.resumo.convitesValidos > 0"
          :itens="itensResumoImportacao(previa)"
          :rotulo="TEXTOS_IMPORTACAO.resumoRotulo"
        >
          <template #rodape>
            {{ TEXTOS_IMPORTACAO.rodapeResumo(previa.resumo.convidadosExistentes, totalDepois) }}
          </template>
        </ResumoContagem>

        <MensagemFormulario
          v-if="acimaDoLimite"
          :mensagem="TEXTOS_IMPORTACAO.acimaDoLimite(previa.resumo.limitePorEvento)"
          data-teste="previa-limite"
        />

        <MensagemFormulario
          v-if="previa.colunasIgnoradas.length > 0"
          variante="informacao"
          :mensagem="TEXTOS_IMPORTACAO.colunasIgnoradas(previa.colunasIgnoradas)"
          data-teste="previa-colunas-ignoradas"
        />
      </div>

      <div class="previa__principal pilha pilha--bloco">
        <section
          v-if="itensProblemas.length > 0"
          class="previa__secao"
          aria-labelledby="previa-titulo-problemas"
          data-teste="previa-problemas"
        >
          <h2
            id="previa-titulo-problemas"
            class="previa__titulo-secao"
          >
            {{ temBloqueantes ? TEXTOS_IMPORTACAO.secaoProblemas : TEXTOS_IMPORTACAO.secaoAvisos }}
          </h2>
          <ListaProblemasLinha
            :itens="itensProblemas"
            :filtros="filtrosProblemas"
            :textos="textosProblemas"
          />
          <div class="previa__acoes-secao">
            <slot name="acoes-problemas" />
          </div>
        </section>

        <section
          v-if="previa.convites.length > 0"
          class="previa__secao"
          aria-labelledby="previa-titulo-convites"
          data-teste="previa-convites"
        >
          <h2
            id="previa-titulo-convites"
            class="previa__titulo-secao"
          >
            {{ TEXTOS_IMPORTACAO.secaoConvites }}
            <span class="previa__contagem numeros-tabulares">{{ TEXTOS_IMPORTACAO.contagemConvites(previa.resumo.convitesValidos) }}</span>
          </h2>
          <ul class="previa__convites">
            <li
              v-for="(convite, indice) in convitesExibidos"
              :key="`${indice}-${convite.nome}`"
              class="previa__convite"
              :class="{ 'previa__convite--fora': !convite.valido }"
              data-teste="previa-convite"
            >
              <div class="previa__convite-cabecalho">
                <span class="previa__convite-nome">{{ convite.nome }}</span>
                <BadgeStatus
                  v-if="!convite.valido"
                  :texto="TEXTOS_IMPORTACAO.ficaDeFora"
                  variante="alerta"
                />
              </div>
              <p class="previa__convite-detalhe">
                {{ convite.grupo ?? TEXTOS_IMPORTACAO.semGrupo }}<template v-if="convite.limiteAcompanhantes > 0">
                  <span aria-hidden="true">, </span>{{ TEXTOS_IMPORTACAO.acompanhantes(convite.limiteAcompanhantes) }}
                </template>
              </p>
              <ul class="previa__pessoas">
                <li
                  v-for="pessoa in convite.pessoas"
                  :key="pessoa.linha"
                  class="previa__pessoa"
                >
                  <span>{{ pessoa.nome || TEXTOS_IMPORTACAO.semNome }}</span>
                  <BadgeStatus
                    v-if="pessoa.faixaEtaria === 'Crianca'"
                    :texto="TEXTOS_IMPORTACAO.crianca"
                  />
                </li>
              </ul>
              <p
                v-if="!convite.valido"
                class="previa__convite-detalhe"
              >
                {{ TEXTOS_IMPORTACAO.ficaDeForaDetalhe(convite.pessoas.filter((pessoa) => pessoa.situacao !== 'Valida').map((pessoa) => pessoa.linha)) }}
              </p>
            </li>
          </ul>
          <Button
            v-if="!todosConvites && convitesOrdenados.length > LIMITE_CONVITES"
            class="previa__mais"
            :label="TEXTOS_IMPORTACAO.mostrarTodos(convitesOrdenados.length)"
            severity="secondary"
            text
            data-teste="previa-mostrar-todos"
            @click="todosConvites = true"
          />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.previa {
  container: previa / inline-size;
}

.previa__grade {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-cartao);
  align-items: start;
}

.previa__abertura {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.previa__frase {
  max-width: 30ch;
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
  color: var(--p-cor-texto);
  text-wrap: balance;
}

.previa__arquivo {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.previa__lateral,
.previa__principal {
  min-width: 0;
}

.previa__secao {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.previa__titulo-secao {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.previa__contagem {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.previa__acoes-secao {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.previa__acoes-secao:empty {
  display: none;
}

.previa__acoes-secao :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.previa__convites {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.previa__convite {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding: var(--p-ritmo-grupo);
}

.previa__convite + .previa__convite {
  border-top: 1px solid var(--p-cor-borda);
}

.previa__convite--fora {
  background: var(--p-cor-neutro-suave);
}

.previa__convite:first-child {
  border-start-start-radius: var(--p-raio-painel);
  border-start-end-radius: var(--p-raio-painel);
}

.previa__convite:last-child {
  border-end-start-radius: var(--p-raio-painel);
  border-end-end-radius: var(--p-raio-painel);
}

.previa__convite-cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.previa__convite-nome {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.previa__convite-detalhe {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.previa__pessoas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.previa__pessoa {
  display: inline-flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.previa__mais {
  align-self: flex-start;
}

@container previa (min-width: 36rem) {
  .previa__convite {
    padding: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
  }

  .previa__acoes-secao {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .previa__frase {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}

@container previa (min-width: 56rem) {
  .previa__grade--com-lateral {
    grid-template-columns: minmax(0, 1fr) 20rem;
    column-gap: var(--p-ritmo-bloco);
  }

  .previa__abertura {
    grid-column: 1 / -1;
  }

  .previa__lateral {
    position: sticky;
    top: var(--p-ritmo-cartao);
    grid-column: 2;
    grid-row: 2 / span 2;
  }

  .previa__principal {
    grid-column: 1;
    grid-row: 2;
  }

  .previa__lateral :deep(.resumo-contagem__itens) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-flow: row;
  }

  .previa__lateral :deep(.resumo-contagem__item:nth-child(n)) {
    padding: var(--p-ritmo-grupo);
    border-top: 0;
    border-left: 0;
  }

  .previa__lateral :deep(.resumo-contagem__item:nth-child(even)) {
    border-left: 1px solid var(--p-cor-borda);
  }

  .previa__lateral :deep(.resumo-contagem__item:nth-child(n + 3)) {
    border-top: 1px solid var(--p-cor-borda);
  }

  .previa__lateral :deep(.resumo-contagem__rodape) {
    padding: var(--p-ritmo-grupo);
  }
}
</style>
