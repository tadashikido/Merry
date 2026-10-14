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
      :mensagem="TEXTOS_IMPORTACAO.acimaDoLimite(previa.resumo.limitePorCasamento)"
      data-teste="previa-limite"
    />

    <MensagemFormulario
      v-if="previa.colunasIgnoradas.length > 0"
      variante="informacao"
      :mensagem="TEXTOS_IMPORTACAO.colunasIgnoradas(previa.colunasIgnoradas)"
      data-teste="previa-colunas-ignoradas"
    />

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
</template>

<style scoped>
.previa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.previa__abertura {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.previa__frase {
  max-width: 34ch;
  margin: 0;
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
  text-wrap: balance;
}

.previa__arquivo {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.previa__secao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
}

.previa__titulo-secao {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-espaco-3);
  margin: 0;
  font-size: var(--p-fonte-tamanho-secao);
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
  gap: var(--p-espaco-3);
}

.previa__acoes-secao:empty {
  display: none;
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
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-4);
}

.previa__convite + .previa__convite {
  border-top: 1px solid var(--p-cor-borda);
}

.previa__convite--fora {
  background: var(--p-cor-neutro-suave);
}

.previa__convite-cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.previa__convite-nome {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.previa__convite-detalhe {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.previa__pessoas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.previa__pessoa {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.previa__mais {
  align-self: flex-start;
}

@media (min-width: 640px) {
  .previa__convite {
    padding: var(--p-espaco-4) var(--p-espaco-6);
  }

  .previa__acoes-secao {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (min-width: 1024px) {
  .previa__frase {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}
</style>
