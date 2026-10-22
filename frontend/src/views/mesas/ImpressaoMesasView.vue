<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import { useEventosStore } from '@/stores/eventos'
import { useMesasStore } from '@/stores/mesas'
import { TEXTOS_IMPRESSAO_MESAS, TEXTOS_MESAS } from '@/textos/mesas'
import type { PessoaMesaDto } from '@/tipos/mesas'
import { formatarDataCalendarioComDiaSemana, formatarDataHora, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { agruparPorConvite, conviteDeUmaPessoa, mesasComPessoas, rotuloMesa } from '@/utilitarios/mesas'

const props = defineProps<{ id: string }>()

const eventos = useEventosStore()
const store = useMesasStore()

const geradoEm = new Date().toISOString()

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const mapa = computed(() => (store.eventoId === props.id ? store.mapa : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))

const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const quando = computed(() => {
  if (!evento.value) {
    return ''
  }
  const data = formatarDataCalendarioComDiaSemana(evento.value.data)
  return evento.value.horario ? `${data}, ${evento.value.horario}` : data
})
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
    void eventos.obter(id)
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
        :to="{ name: 'evento-mesas', params: { id } }"
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
      class="mapa pilha pilha--bloco"
      data-teste="mapa-mesas-impressao"
    >
      <header class="mapa__cabecalho pilha pilha--grupo">
        <div class="mapa__documento">
          <p class="mapa__documento-nome">
            {{ TEXTOS_IMPRESSAO_MESAS.documento }}
          </p>
          <p class="mapa__gerado texto-legenda numeros-tabulares">
            {{ TEXTOS_IMPRESSAO_MESAS.gerado(formatarDataHora(geradoEm)) }}
          </p>
        </div>
        <div class="mapa__identificacao pilha pilha--campo">
          <h1 class="mapa__anfitriao">
            {{ nomes }}
          </h1>
          <p
            v-if="quando"
            class="mapa__quando numeros-tabulares"
          >
            {{ quando }}
          </p>
          <p
            v-if="evento?.localRecepcao"
            class="mapa__local"
            data-teste="local-impressao"
          >
            {{ evento.localRecepcao }}
          </p>
        </div>
      </header>

      <p
        class="mapa__totais numeros-tabulares"
        data-teste="totais-impressao"
      >
        {{ TEXTOS_IMPRESSAO_MESAS.totais(mapa.totais.acomodados, mapa.totais.lugaresLivres, mapa.totais.semMesa, mapa.totais.mesas) }}
      </p>

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
          class="mapa__mesa pilha pilha--grupo"
          :class="{ 'mapa__mesa--especial': item.mesa.especial }"
          data-teste="mesa-impressao"
        >
          <div class="mapa__mesa-cabecalho pilha pilha--campo">
            <p
              v-if="item.mesa.especial && item.mesa.nome"
              class="mapa__selo texto-rotulo"
              data-teste="selo-anfitrioes"
            >
              {{ TEXTOS_MESAS.rotuloMesaAnfitrioes }}
            </p>
            <h2 class="mapa__mesa-titulo">
              {{ rotuloMesa(item.mesa) }}
            </h2>
            <OcupacaoMesa
              :ocupados="item.mesa.ocupacao"
              :lugares="item.mesa.capacidade"
              compacta
            />
          </div>
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
        class="mapa__sem-mesa pilha pilha--grupo"
        data-teste="sem-mesa-impressao"
      >
        <h2 class="mapa__secao-titulo">
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

      <footer
        class="mapa__rodape"
        data-teste="rodape-impressao"
      >
        {{ TEXTOS_IMPRESSAO_MESAS.rodape }}
      </footer>
    </article>
  </LayoutImpressao>
</template>

<style scoped>
.mapa {
  container: mapa / inline-size;
}

.mapa__cabecalho {
  padding-bottom: var(--p-ritmo-cartao);
  border-bottom: 1px solid var(--p-cor-texto);
}

.mapa__documento {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  padding-bottom: var(--p-ritmo-campo);
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.mapa__documento-nome {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.mapa__gerado {
  margin: 0;
}

.mapa__identificacao {
  min-width: 0;
}

.mapa__anfitriao {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
  overflow-wrap: anywhere;
}

.mapa__quando,
.mapa__local {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-style: italic;
  color: var(--p-cor-texto);
}

.mapa__totais {
  margin: 0;
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.mapa__nota {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-apoio);
}

.mapa__mesas {
  columns: 1;
  column-gap: var(--p-ritmo-grupo);
}

.mapa__mesa {
  min-width: 0;
  margin-bottom: var(--p-ritmo-grupo);
  padding: var(--p-ritmo-grupo);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  break-inside: avoid;
}

.mapa__mesa--especial {
  border-color: var(--p-cor-texto-apoio);
}

.mapa__mesa-cabecalho {
  padding-bottom: var(--p-ritmo-campo);
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.mapa__selo {
  margin: 0;
}

.mapa__mesa-titulo,
.mapa__secao-titulo {
  font-family: var(--p-fonte-interface);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  overflow-wrap: anywhere;
}

.mapa__mesa-titulo {
  font-size: var(--p-fonte-tamanho-corpo);
}

.mapa__secao-titulo {
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-regular);
}

.mapa__pessoas,
.mapa__convites {
  margin: 0;
  padding-left: var(--p-ritmo-cartao);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  overflow-wrap: anywhere;
}

.mapa__convites {
  columns: 1;
  column-gap: var(--p-ritmo-cartao);
}

.mapa__convites li {
  padding-bottom: var(--p-ritmo-campo);
  break-inside: avoid;
}

.mapa__convites strong {
  font-weight: var(--p-fonte-peso-medio);
}

.mapa__sem-mesa {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.mapa__rodape {
  padding-top: var(--p-ritmo-grupo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
  border-top: 1px solid var(--p-cor-texto);
  break-inside: avoid;
}

@container mapa (min-width: 36rem) {
  .mapa__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .mapa__mesas,
  .mapa__convites {
    columns: 2;
  }
}

@container mapa (min-width: 56rem) {
  .mapa__mesas,
  .mapa__convites {
    columns: 3;
  }
}

@media print {
  .mapa {
    --pilha-espaco: var(--p-ritmo-cartao);
  }

  .mapa__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina-celular);
  }

  .mapa__mesas,
  .mapa__convites {
    columns: 2;
  }

  .mapa__mesa {
    padding: var(--p-ritmo-campo) var(--p-ritmo-grupo) var(--p-ritmo-grupo);
    border-color: var(--p-cor-texto-apoio);
  }

  .mapa__mesa--especial {
    border-color: var(--p-cor-texto);
  }

  .mapa__nota,
  .mapa__gerado,
  .mapa__selo,
  .mapa :deep(.ocupacao-mesa__texto) {
    color: var(--p-cor-texto);
  }
}
</style>
