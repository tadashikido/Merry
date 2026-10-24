<script setup lang="ts">
import { computed, useId } from 'vue'

import { ROTULOS_CATEGORIA_FORNECEDOR, TEXTOS_ATUACAO_FORNECEDOR } from '@/textos/fornecedores'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { ResumoAtuacaoFornecedor } from '@/utilitarios/atuacaoFornecedor'
import { descreverCarteiraPorTipo } from '@/utilitarios/carteiraEventos'
import type { EssencialidadeCategoria } from '@/utilitarios/coberturaFornecedores'
import { formatarDataCalendarioCurta, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const props = defineProps<{
  resumo: ResumoAtuacaoFornecedor
  categoria: CategoriaFornecedor
  essencialidade: EssencialidadeCategoria
}>()

const idTitulo = useId()

const fraseCategoria = computed(() => {
  const rotulo = ROTULOS_CATEGORIA_FORNECEDOR[props.categoria]
  const { daCarteira, tipos, eventos } = props.essencialidade
  if (tipos.length === 0) {
    return daCarteira ? TEXTOS_ATUACAO_FORNECEDOR.naoEssencialCarteira(rotulo) : TEXTOS_ATUACAO_FORNECEDOR.naoEssencial(rotulo)
  }
  return daCarteira ? TEXTOS_ATUACAO_FORNECEDOR.essencialCarteira(rotulo, eventos) : TEXTOS_ATUACAO_FORNECEDOR.essencialTipos(rotulo, tipos)
})

const proximo = computed(() => {
  const participacao = props.resumo.proximo
  return participacao
    ? TEXTOS_ATUACAO_FORNECEDOR.proximo(
        formatarNomesAnfitrioes(participacao.nomePrimeiraPessoa, participacao.nomeSegundaPessoa),
        formatarDataCalendarioCurta(participacao.dataEvento),
      )
    : null
})

const mostrarPorTipo = computed(() => props.resumo.tiposConhecidos && (props.resumo.porTipo.length > 0 || props.resumo.semTipo > 0))
</script>

<template>
  <section
    class="atuacao cartao"
    :aria-labelledby="idTitulo"
    data-teste="atuacao-fornecedor"
  >
    <h2
      :id="idTitulo"
      class="atuacao__titulo texto-rotulo"
    >
      {{ TEXTOS_ATUACAO_FORNECEDOR.titulo }}
    </h2>

    <div
      class="atuacao__corpo"
      aria-live="polite"
    >
      <div
        v-if="resumo.total > 0"
        class="atuacao__resumo"
      >
        <p
          class="atuacao__frase"
          data-teste="atuacao-total"
        >
          <span class="atuacao__numero numeros-tabulares">{{ resumo.total.toLocaleString('pt-BR') }}</span>{{ ' ' }}<span class="atuacao__legenda">{{ TEXTOS_ATUACAO_FORNECEDOR.legenda(resumo.total) }}</span>
        </p>
        <p
          class="atuacao__contratados"
          data-teste="atuacao-contratados"
        >
          {{ TEXTOS_ATUACAO_FORNECEDOR.contratados(resumo.contratados, resumo.total) }}
        </p>
      </div>

      <dl
        v-if="resumo.total > 0"
        class="atuacao__indicadores"
        :aria-label="TEXTOS_ATUACAO_FORNECEDOR.indicadoresRotulo"
      >
        <div
          class="atuacao__indicador"
          data-teste="atuacao-pela-frente"
        >
          <dt class="atuacao__rotulo">
            {{ TEXTOS_ATUACAO_FORNECEDOR.pelaFrenteRotulo }}
          </dt>
          <dd class="atuacao__valor">
            {{ TEXTOS_ATUACAO_FORNECEDOR.pelaFrente(resumo.pelaFrente) }}
          </dd>
          <dd
            v-if="proximo"
            class="atuacao__apoio"
            data-teste="atuacao-proximo"
          >
            {{ proximo }}
          </dd>
        </div>

        <div
          v-if="resumo.ultimaAtuacao"
          class="atuacao__indicador"
          data-teste="atuacao-ultima"
        >
          <dt class="atuacao__rotulo">
            {{ TEXTOS_ATUACAO_FORNECEDOR.ultimaRotulo }}
          </dt>
          <dd class="atuacao__valor">
            {{ formatarDataCalendarioCurta(resumo.ultimaAtuacao) }}
          </dd>
        </div>

        <div
          v-if="mostrarPorTipo"
          class="atuacao__indicador"
          data-teste="atuacao-por-tipo"
        >
          <dt class="atuacao__rotulo">
            {{ TEXTOS_ATUACAO_FORNECEDOR.porTipoRotulo }}
          </dt>
          <dd
            v-if="resumo.porTipo.length > 0"
            class="atuacao__valor"
            data-teste="atuacao-tipos"
          >
            {{ descreverCarteiraPorTipo(resumo.porTipo) }}
          </dd>
          <dd
            v-if="resumo.semTipo > 0"
            class="atuacao__apoio"
            data-teste="atuacao-sem-tipo"
          >
            {{ TEXTOS_ATUACAO_FORNECEDOR.semTipo(resumo.semTipo) }}
          </dd>
        </div>
      </dl>

      <p
        class="atuacao__categoria"
        data-teste="atuacao-categoria"
      >
        {{ fraseCategoria }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.atuacao {
  container: atuacao-fornecedor / inline-size;
  display: grid;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.atuacao__corpo {
  display: grid;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.atuacao .atuacao__titulo,
.atuacao__frase,
.atuacao__contratados,
.atuacao__categoria,
.atuacao__indicadores,
.atuacao__indicador dd {
  margin: 0;
}

.atuacao__resumo {
  display: grid;
  gap: var(--p-ritmo-campo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.atuacao__frase {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-ritmo-campo);
}

.atuacao__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-primaria);
}

.atuacao__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

.atuacao__contratados {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.atuacao__indicadores {
  display: grid;
  gap: var(--p-ritmo-grupo);
  padding-block-start: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.atuacao__indicador {
  display: grid;
  gap: var(--p-ritmo-campo);
  align-content: start;
  min-width: 0;
}

.atuacao__rotulo {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.atuacao__valor {
  font-size: var(--p-fonte-tamanho-controle);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.atuacao__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.atuacao__indicadores + .atuacao__categoria {
  padding-block-start: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.atuacao__categoria {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

@container atuacao-fornecedor (min-width: 36rem) {
  .atuacao__indicadores {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
  }
}
</style>
