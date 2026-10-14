<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import { useCasamentosStore } from '@/stores/casamentos'
import { useMesasStore } from '@/stores/mesas'
import { TEXTOS_IMPRESSAO_MESAS, TEXTOS_MESAS } from '@/textos/mesas'
import type { PessoaMesaDto } from '@/tipos/mesas'
import { formatarDataCalendarioComDiaSemana, formatarDataHora, formatarNomesCasal } from '@/utilitarios/formatacao'
import { agruparPorConvite, conviteDeUmaPessoa, mesasComPessoas, rotuloMesa } from '@/utilitarios/mesas'

const props = defineProps<{ id: string }>()

const casamentos = useCasamentosStore()
const store = useMesasStore()

const geradoEm = new Date().toISOString()

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const mapa = computed(() => (store.casamentoId === props.id ? store.mapa : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))

const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const mesas = computed(() => (mapa.value ? mesasComPessoas(mapa.value.mesas, mapa.value.pessoas, mapa.value.pessoas) : []))
const semMesa = computed(() => agruparPorConvite((mapa.value?.pessoas ?? []).filter((pessoa) => pessoa.mesaId === null)))

function marcadores(pessoa: PessoaMesaDto): string {
  const partes: string[] = []
  if (pessoa.faixaEtaria === 'Crianca') {
    partes.push(TEXTOS_MESAS.crianca.toLowerCase())
  }
  if (pessoa.acompanhante) {
    partes.push(TEXTOS_MESAS.acompanhante.toLowerCase())
  }
  return partes.join(', ')
}

function descreverPessoa(pessoa: PessoaMesaDto): string {
  const marcas = marcadores(pessoa)
  return marcas ? `${pessoa.nome} (${marcas})` : pessoa.nome
}

watch(
  () => props.id,
  (id) => {
    void casamentos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_IMPRESSAO_MESAS.titulo(valor)
    }
  },
  { immediate: true },
)

function imprimir() {
  window.print()
}
</script>

<template>
  <LayoutImpressao :rotulo-acoes="TEXTOS_IMPRESSAO_MESAS.acoesRotulo">
    <template #acoes>
      <RouterLink
        :to="{ name: 'casamento-mesas', params: { id } }"
        data-teste="voltar-mesas"
      >
        {{ TEXTOS_IMPRESSAO_MESAS.voltar }}
      </RouterLink>
      <Button
        :label="TEXTOS_IMPRESSAO_MESAS.imprimir"
        icon="ie ie-imprimir"
        :disabled="!mapa"
        data-teste="imprimir"
        @click="imprimir"
      />
    </template>

    <EstadoCarregando
      v-if="store.carregando && !mapa"
      variante="cartao"
      :linhas="3"
    />

    <EstadoErro
      v-else-if="falha"
      :titulo="falha.tipo === 'naoEncontrado' ? TEXTOS_MESAS.naoEncontradoTitulo : TEXTOS_IMPRESSAO_MESAS.erroCarregar"
      :mensagem="falha.tipo === 'semPermissao' ? TEXTOS_MESAS.semAcesso : TEXTOS_MESAS.naoEncontradoTexto"
      :variante="falha.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
      :pode-tentar-novamente="falha.tipo !== 'semPermissao' && falha.tipo !== 'naoEncontrado'"
      @tentar-novamente="store.carregar(id)"
    />

    <article
      v-else-if="mapa"
      class="mapa"
      data-teste="mapa-mesas-impressao"
    >
      <header class="mapa__cabecalho">
        <h1 class="mapa__casal">
          {{ nomes }}
        </h1>
        <p
          v-if="casamento"
          class="mapa__quando"
        >
          {{ formatarDataCalendarioComDiaSemana(casamento.data) }}
        </p>
        <p class="mapa__gerado">
          {{ TEXTOS_IMPRESSAO_MESAS.gerado(formatarDataHora(geradoEm)) }}
        </p>
        <p
          class="mapa__totais numeros-tabulares"
          data-teste="totais-impressao"
        >
          {{ TEXTOS_IMPRESSAO_MESAS.totais(mapa.totais.acomodados, mapa.totais.lugaresLivres, mapa.totais.semMesa, mapa.totais.mesas) }}
        </p>
      </header>

      <p
        v-if="mesas.length === 0"
        class="mapa__nota"
      >
        {{ TEXTOS_IMPRESSAO_MESAS.semMesas }}
      </p>
      <div
        v-else
        class="mapa__mesas"
      >
        <section
          v-for="item in mesas"
          :key="item.mesa.id"
          class="mapa__mesa"
          :class="{ 'mapa__mesa--especial': item.mesa.especial }"
          data-teste="mesa-impressao"
        >
          <h2 class="mapa__mesa-titulo">
            {{ rotuloMesa(item.mesa) }}
          </h2>
          <OcupacaoMesa
            :ocupados="item.mesa.ocupacao"
            :lugares="item.mesa.capacidade"
            compacta
          />
          <ol
            v-if="item.pessoas.length > 0"
            class="mapa__pessoas"
          >
            <li
              v-for="pessoa in item.pessoas"
              :key="pessoa.id"
            >
              {{ descreverPessoa(pessoa) }}
            </li>
          </ol>
          <p
            v-else
            class="mapa__nota"
          >
            {{ TEXTOS_MESAS.mesaVazia }}
          </p>
        </section>
      </div>

      <section
        v-if="semMesa.length > 0"
        class="mapa__sem-mesa"
        data-teste="sem-mesa-impressao"
      >
        <h2 class="mapa__mesa-titulo">
          {{ TEXTOS_IMPRESSAO_MESAS.semMesaTitulo(mapa.totais.semMesa) }}
        </h2>
        <ul class="mapa__convites">
          <li
            v-for="grupoConvite in semMesa"
            :key="grupoConvite.conviteId"
          >
            <template v-if="conviteDeUmaPessoa(grupoConvite.convite, grupoConvite.pessoas)">
              {{ descreverPessoa(grupoConvite.pessoas[0]!) }}
            </template>
            <template v-else>
              <strong>{{ grupoConvite.convite }}:</strong> {{ grupoConvite.pessoas.map(descreverPessoa).join(', ') }}
            </template>
          </li>
        </ul>
      </section>

      <footer class="mapa__rodape">
        {{ TEXTOS_IMPRESSAO_MESAS.rodape }}
      </footer>
    </article>
  </LayoutImpressao>
</template>

<style scoped>
.mapa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.mapa__cabecalho {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding-bottom: var(--p-espaco-4);
  border-bottom: 1px solid var(--p-cor-borda);
}

.mapa__casal {
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.mapa__quando,
.mapa__totais {
  margin: 0;
  color: var(--p-cor-texto);
}

.mapa__gerado,
.mapa__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.mapa__mesas {
  columns: 1;
  column-gap: var(--p-espaco-8);
}

.mapa__mesa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin-bottom: var(--p-espaco-5);
  break-inside: avoid;
}

.mapa__mesa--especial .mapa__mesa-titulo {
  color: var(--p-cor-champagne-texto);
}

.mapa__mesa-titulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.mapa__pessoas,
.mapa__convites {
  margin: var(--p-espaco-1) 0 0;
  padding-left: var(--p-espaco-5);
  font-size: var(--p-fonte-tamanho-controle);
}

.mapa__sem-mesa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  break-inside: avoid;
}

.mapa__rodape {
  padding-top: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  border-top: 1px solid var(--p-cor-borda);
}

@media (min-width: 640px) {
  .mapa__casal {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .mapa__mesas {
    columns: 2;
  }
}

@media print {
  .mapa {
    gap: 6mm;
  }

  .mapa__mesas {
    columns: 2;
  }

  .mapa__casal {
    font-size: 20pt;
  }
}
</style>
