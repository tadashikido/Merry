<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import { useEventosStore } from '@/stores/eventos'
import { useMesasStore } from '@/stores/mesas'
import { TEXTOS_FECHAMENTO_MESAS, TEXTOS_IMPRESSAO_MESAS, TEXTOS_MESAS } from '@/textos/mesas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { PessoaMesaDto } from '@/tipos/mesas'
import { cabecalhoFichaEvento, origemInterna } from '@/utilitarios/fichaBuffet'
import { formatarDataHora, formatarNomesAnfitrioes, formatarNumero } from '@/utilitarios/formatacao'
import { agruparPorConvite, conviteDeUmaPessoa, mesasComPessoas, resumoDaMesa, rotuloMesa } from '@/utilitarios/mesas'

const props = defineProps<{ id: string }>()

const eventos = useEventosStore()
const store = useMesasStore()
const roteador = useRouter()

const geradoEm = new Date().toISOString()

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const mapa = computed(() => (store.eventoId === props.id ? store.mapa : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))

const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const cabecalho = computed(() => (evento.value ? cabecalhoFichaEvento(evento.value, evento.value) : null))
const termoEspecial = computed(() => vocabularioOuNeutro(cabecalho.value?.tipo).mesaEspecial)

const mesas = computed(() =>
  mapa.value
    ? mesasComPessoas(mapa.value.mesas, mapa.value.pessoas, mapa.value.pessoas).map((item) => ({
        ...item,
        resumo: resumoDaMesa(item.mesa, item.pessoas),
      }))
    : [],
)
const semMesa = computed(() => agruparPorConvite((mapa.value?.pessoas ?? []).filter((pessoa) => pessoa.mesaId === null)))
const temEspecial = computed(() => mesas.value.some((item) => item.mesa.especial))

const resumo = computed(() => {
  const totais = mapa.value?.totais
  if (!totais) {
    return []
  }
  return [
    { chave: 'mesas', valor: totais.mesas, rotulo: TEXTOS_IMPRESSAO_MESAS.resumoMesas(totais.mesas) },
    { chave: 'lugares', valor: totais.capacidadeTotal, rotulo: TEXTOS_IMPRESSAO_MESAS.resumoLugares(totais.capacidadeTotal) },
    { chave: 'sentados', valor: totais.acomodados, rotulo: TEXTOS_IMPRESSAO_MESAS.resumoSentados(totais.acomodados) },
    { chave: 'livres', valor: totais.lugaresLivres, rotulo: TEXTOS_IMPRESSAO_MESAS.resumoLivres(totais.lugaresLivres) },
    { chave: 'sem-mesa', valor: totais.semMesa, rotulo: TEXTOS_IMPRESSAO_MESAS.resumoSemMesa },
  ]
})

const faltamLugares = computed(() => {
  const totais = mapa.value?.totais
  return totais ? Math.max(totais.semMesa - totais.lugaresLivres, 0) : 0
})

function lerEstadoAnterior(): unknown {
  const estado: unknown = window.history.state
  return typeof estado === 'object' && estado !== null && 'back' in estado ? estado.back : null
}

const voltar = computed(() => {
  const origem = origemInterna(
    lerEstadoAnterior(),
    props.id,
    (caminho) => roteador.resolve(caminho),
    ['evento-mesas', 'painel-confirmacoes'],
    'evento-mesas',
  )
  return {
    rota: { name: origem, params: { id: props.id } },
    rotulo: origem === 'painel-confirmacoes' ? TEXTOS_IMPRESSAO_MESAS.voltarConfirmacoes : TEXTOS_IMPRESSAO_MESAS.voltar,
  }
})

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
        :to="voltar.rota"
        data-teste="voltar-mesas"
      >
        {{ voltar.rotulo }}
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
          <p
            v-if="cabecalho?.tipoRotulo"
            class="mapa__tipo"
            data-teste="mapa-tipo"
          >
            {{ cabecalho.tipoRotulo }}
          </p>
          <h1 class="mapa__anfitriao">
            {{ nomes }}
          </h1>
        </div>
        <dl
          v-if="cabecalho"
          class="mapa__detalhes"
          :aria-label="TEXTOS_IMPRESSAO_MESAS.detalhesRotulo"
          data-teste="mapa-detalhes"
        >
          <div
            v-for="detalhe in cabecalho.detalhes"
            :key="detalhe.chave"
            class="mapa__detalhe"
            :data-teste="`mapa-detalhe-${detalhe.chave}`"
          >
            <dt>{{ detalhe.rotulo }}</dt>
            <dd class="numeros-tabulares">
              {{ detalhe.valor }}
            </dd>
          </div>
        </dl>
      </header>

      <div class="mapa__conferencia pilha pilha--grupo">
        <ul
          class="mapa__resumo"
          :aria-label="TEXTOS_IMPRESSAO_MESAS.resumoRotulo"
          data-teste="totais-impressao"
        >
          <li
            v-for="item in resumo"
            :key="item.chave"
            class="mapa__resumo-item"
            :data-teste="`total-${item.chave}`"
          >
            <span class="mapa__resumo-numero">{{ formatarNumero(item.valor) }}</span>{{ ' ' }}<span class="mapa__resumo-rotulo">{{ item.rotulo }}</span>
          </li>
        </ul>

        <p
          v-if="faltamLugares > 0"
          class="mapa__faltam"
          data-teste="faltam-impressao"
        >
          {{ TEXTOS_FECHAMENTO_MESAS.faltam(faltamLugares) }}
        </p>

        <ul
          v-if="mesas.length > 0"
          class="mapa__legenda"
          :aria-label="TEXTOS_IMPRESSAO_MESAS.legendaRotulo"
          data-teste="legenda-impressao"
        >
          <li class="mapa__legenda-item">
            <span
              class="mapa__amostra mapa__amostra--ocupado"
              aria-hidden="true"
            />{{ ' ' }}{{ TEXTOS_IMPRESSAO_MESAS.legendaOcupado }}
          </li>
          <li class="mapa__legenda-item">
            <span
              class="mapa__amostra"
              aria-hidden="true"
            />{{ ' ' }}{{ TEXTOS_IMPRESSAO_MESAS.legendaLivre }}
          </li>
          <li class="mapa__legenda-item">
            {{ TEXTOS_IMPRESSAO_MESAS.legendaMarcadores }}
          </li>
          <li
            v-if="temEspecial"
            class="mapa__legenda-item"
            data-teste="legenda-especial"
          >
            <span
              class="mapa__amostra-especial"
              aria-hidden="true"
            />{{ ' ' }}{{ TEXTOS_IMPRESSAO_MESAS.legendaEspecial(termoEspecial) }}
          </li>
        </ul>
      </div>

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
              class="mapa__selo"
              data-teste="selo-anfitrioes"
            >
              {{ termoEspecial }}
            </p>
            <h2 class="mapa__mesa-titulo">
              {{ rotuloMesa(item.mesa, termoEspecial) }}
            </h2>
            <OcupacaoMesa
              :ocupados="item.mesa.ocupacao"
              :lugares="item.mesa.capacidade"
              compacta
            />
            <p
              class="mapa__mesa-resumo numeros-tabulares"
              data-teste="resumo-mesa"
            >
              <span>{{ item.resumo.completa ? TEXTOS_IMPRESSAO_MESAS.completa : TEXTOS_IMPRESSAO_MESAS.livresNaMesa(item.resumo.livres) }}</span><span
                v-if="item.resumo.criancas > 0"
                data-teste="criancas-mesa"
              >{{ ', ' }}{{ TEXTOS_IMPRESSAO_MESAS.criancasNaMesa(item.resumo.criancas) }}</span>
            </p>
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

.mapa__tipo {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.mapa__detalhes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-campo) var(--p-ritmo-cartao);
  margin: 0;
}

.mapa__detalhe {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mapa__detalhe dt {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.mapa__detalhe dd {
  margin: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.mapa__conferencia {
  break-inside: avoid;
}

.mapa__resumo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo) var(--p-ritmo-cartao);
  margin: 0;
  padding: 0;
  list-style: none;
}

.mapa__resumo-item {
  display: flex;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
}

.mapa__resumo-numero {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.mapa__resumo-rotulo {
  font-family: var(--p-fonte-serif);
  font-style: italic;
  color: var(--p-cor-texto-apoio);
}

.mapa__faltam {
  margin: 0;
  padding-left: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
  border-left: medium solid var(--p-cor-primaria);
}

.mapa__legenda {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  margin: 0;
  padding: var(--p-ritmo-campo) 0 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
  list-style: none;
  border-top: 1px dotted var(--p-cor-borda-campo);
}

.mapa__legenda-item {
  display: inline-flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.mapa__amostra {
  flex: none;
  inline-size: 0.625em;
  block-size: 0.625em;
  border: thin dashed var(--p-cor-borda-campo);
  border-radius: var(--p-raio-total);
}

.mapa__amostra--ocupado {
  border: 0.3125em solid var(--p-cor-primaria);
}

.mapa__amostra-especial {
  flex: none;
  inline-size: 1.25em;
  border-top: medium solid var(--p-cor-primaria);
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
  border-top: medium solid var(--p-cor-primaria);
}

.mapa__mesa-resumo {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.mapa__mesa-cabecalho {
  padding-bottom: var(--p-ritmo-campo);
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.mapa__selo {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
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

  .mapa__detalhes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .mapa__detalhes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mapa__faltam {
    border-left-color: var(--p-cor-texto);
  }

  .mapa__amostra--ocupado {
    border-color: var(--p-cor-texto);
  }

  .mapa__amostra-especial {
    border-top-color: var(--p-cor-texto);
  }

  .mapa__nota,
  .mapa__gerado,
  .mapa__selo,
  .mapa__tipo,
  .mapa__detalhe dt,
  .mapa__resumo-rotulo,
  .mapa__legenda,
  .mapa__mesa-resumo,
  .mapa :deep(.ocupacao-mesa__texto) {
    color: var(--p-cor-texto);
  }
}
</style>
