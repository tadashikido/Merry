<script setup lang="ts">
import { computed, useId } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import Button from 'primevue/button'

import EstadoCarregando from './EstadoCarregando.vue'
import LinhaParcela from './LinhaParcela.vue'
import { TEXTOS_ALERTAS_PAGAMENTOS } from '@/textos/financeiro'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import type { AlertasPagamentosDto, ParcelaAlertaDto } from '@/tipos/financeiro'
import { formatarMoeda, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    alertas: AlertasPagamentosDto | null
    contexto?: 'organizacao' | 'evento'
    carregando?: boolean
    comErro?: boolean
    destinoFinanceiro?: RouteLocationRaw | null
  }>(),
  { contexto: 'organizacao', carregando: false, comErro: false, destinoFinanceiro: null },
)

defineEmits<{ tentarNovamente: [] }>()

const idTitulo = `alertas-pagamentos-${useId()}`

interface GrupoAlertas {
  chave: 'vencidas' | 'proximas'
  titulo: string
  total: number
  itens: ParcelaAlertaDto[]
}

const grupos = computed<GrupoAlertas[]>(() => {
  const dados = props.alertas
  if (!dados) {
    return []
  }
  const lista: GrupoAlertas[] = [
    { chave: 'vencidas', titulo: TEXTOS_ALERTAS_PAGAMENTOS.grupoVencidas, total: dados.totalVencidas, itens: dados.vencidas },
    { chave: 'proximas', titulo: TEXTOS_ALERTAS_PAGAMENTOS.grupoProximas, total: dados.totalProximas, itens: dados.proximas },
  ]
  return lista.filter((grupo) => grupo.total > 0)
})

const semAlertas = computed(() => props.alertas !== null && grupos.value.length === 0)

function destinoItem(item: ParcelaAlertaDto): RouteLocationRaw {
  return { name: 'evento-financeiro', params: { id: item.eventoId } }
}

function nomesAnfitrioes(item: ParcelaAlertaDto): string | null {
  return props.contexto === 'organizacao' ? formatarNomesAnfitrioes(item.nomePrimeiraPessoa, item.nomeSegundaPessoa) : null
}
</script>

<template>
  <section
    class="alertas-pagamentos"
    :aria-labelledby="idTitulo"
    data-teste="bloco-alertas-pagamentos"
  >
    <div class="alertas-pagamentos__cabecalho">
      <h2
        :id="idTitulo"
        class="alertas-pagamentos__titulo"
      >
        {{ TEXTOS_ALERTAS_PAGAMENTOS.titulo }}
      </h2>
      <RouterLink
        v-if="destinoFinanceiro"
        class="alertas-pagamentos__ver"
        :to="destinoFinanceiro"
        data-teste="ver-financeiro"
      >
        {{ TEXTOS_ALERTAS_PAGAMENTOS.verFinanceiro }}
      </RouterLink>
    </div>

    <dl
      v-if="alertas && !semAlertas"
      class="alertas-pagamentos__numeros"
    >
      <div class="alertas-pagamentos__numero alertas-pagamentos__numero--vencidas">
        <dt class="alertas-pagamentos__rotulo">
          {{ TEXTOS_ALERTAS_PAGAMENTOS.vencidas(alertas.totalVencidas) }}
          <template v-if="contexto === 'organizacao' && alertas.eventosComVencidas > 0">
            {{ TEXTOS_ALERTAS_PAGAMENTOS.eventos(alertas.eventosComVencidas) }}
          </template>
        </dt>
        <dd
          class="alertas-pagamentos__valor numeros-tabulares"
          data-teste="valor-vencidas"
        >
          {{ formatarMoeda(alertas.valorVencidas) }}
        </dd>
      </div>
      <div class="alertas-pagamentos__numero">
        <dt class="alertas-pagamentos__rotulo">
          {{ TEXTOS_ALERTAS_PAGAMENTOS.proximas(alertas.totalProximas) }}
        </dt>
        <dd
          class="alertas-pagamentos__valor numeros-tabulares"
          data-teste="valor-proximas"
        >
          {{ formatarMoeda(alertas.valorProximas) }}
        </dd>
      </div>
    </dl>

    <EstadoCarregando
      v-if="carregando && !alertas"
      variante="lista"
      :linhas="3"
    />

    <div
      v-else-if="comErro"
      class="alertas-pagamentos__erro"
      role="alert"
    >
      <span
        class="ie ie-alerta"
        aria-hidden="true"
      />
      <span>{{ TEXTOS_ALERTAS_PAGAMENTOS.erro }}</span>
      <Button
        :label="ROTULOS_ACOES.tentarNovamente"
        severity="secondary"
        text
        data-teste="tentar-alertas"
        @click="$emit('tentarNovamente')"
      />
    </div>

    <p
      v-else-if="semAlertas"
      class="alertas-pagamentos__vazio"
      data-teste="alertas-vazio"
    >
      <span
        class="ie ie-concluido"
        aria-hidden="true"
      />
      {{ TEXTOS_ALERTAS_PAGAMENTOS.vazio }}
    </p>

    <div
      v-else-if="alertas"
      class="alertas-pagamentos__grupos"
    >
      <div
        v-for="grupo in grupos"
        :key="grupo.chave"
        :data-teste="`grupo-alertas-${grupo.chave}`"
      >
        <h3
          :id="`${idTitulo}-${grupo.chave}`"
          class="alertas-pagamentos__subtitulo"
        >
          {{ grupo.titulo }}
        </h3>
        <ul
          class="alertas-pagamentos__lista"
          :aria-labelledby="`${idTitulo}-${grupo.chave}`"
        >
          <LinhaParcela
            v-for="item in grupo.itens"
            :key="item.parcelaId"
            :nome-empresa="item.nomeEmpresa"
            :numero="item.numero"
            :total="item.totalParcelas"
            :valor="item.valor"
            :vencimento="item.vencimento"
            :situacao="grupo.chave === 'vencidas' ? 'Vencida' : 'Pendente'"
            :dias-para-vencimento="item.diasParaVencimento"
            :vence-em-breve="grupo.chave === 'proximas'"
            :nomes-anfitrioes="nomesAnfitrioes(item)"
            :destino="destinoItem(item)"
            compacta
          />
        </ul>
        <p
          v-if="grupo.total > grupo.itens.length"
          class="alertas-pagamentos__mais"
          data-teste="alertas-mais"
        >
          {{ TEXTOS_ALERTAS_PAGAMENTOS.mais(grupo.total - grupo.itens.length) }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.alertas-pagamentos {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  padding: var(--p-ritmo-cartao);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
}

.alertas-pagamentos__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-espaco-3);
}

.alertas-pagamentos .alertas-pagamentos__titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.alertas-pagamentos__ver {
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.alertas-pagamentos__numeros {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-6);
  margin: 0;
}

.alertas-pagamentos__numero {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-espaco-1);
}

.alertas-pagamentos__valor {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  line-height: var(--p-fonte-entrelinha-titulo);
  font-variant-numeric: lining-nums tabular-nums;
  color: var(--p-cor-texto);
}

.alertas-pagamentos__numero--vencidas .alertas-pagamentos__valor {
  color: var(--p-cor-erro-texto);
}

.alertas-pagamentos__rotulo {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.alertas-pagamentos__grupos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.alertas-pagamentos__subtitulo {
  margin: 0 0 var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-secundario);
}

.alertas-pagamentos__lista {
  margin: 0;
  padding: 0;
}

.alertas-pagamentos__mais,
.alertas-pagamentos__vazio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.alertas-pagamentos__vazio {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
}

.alertas-pagamentos__vazio .ie {
  color: var(--p-cor-primaria);
}

.alertas-pagamentos__erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-erro-texto);
}
</style>
