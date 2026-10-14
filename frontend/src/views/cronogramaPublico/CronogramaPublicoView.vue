<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import Button from 'primevue/button'

import LayoutPublico from '@/layouts/LayoutPublico.vue'
import CabecalhoOperacao, { type LocalOperacao } from '@/componentes/base/CabecalhoOperacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import FaixaFaseDia from '@/componentes/base/FaixaFaseDia.vue'
import ItemRoteiro from '@/componentes/base/ItemRoteiro.vue'
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import PainelAgoraProximo from '@/componentes/base/PainelAgoraProximo.vue'
import RelogioOperacao from '@/componentes/base/RelogioOperacao.vue'
import { useAtualizacaoPeriodica, useRelogioDispositivo } from '@/composables/useAtualizacaoPeriodica'
import { useCronogramaPublicoStore } from '@/stores/cronogramaPublico'
import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import { agruparRoteiro, ehHorarioDaCerimonia, rotuloFiltro } from '@/utilitarios/cronogramaPublico'
import { formatarDataCalendarioExtenso, formatarHora } from '@/utilitarios/formatacao'
import {
  interpolarMomento,
  INTERVALO_ATUALIZACAO_PUBLICO_MS,
  INTERVALO_RELOGIO_MS,
  itensPainelPublicos,
  minutoAtualNoRoteiro,
} from '@/utilitarios/grandeDia'

const props = defineProps<{ token: string }>()

const store = useCronogramaPublicoStore()
const agoraDispositivo = useRelogioDispositivo(INTERVALO_RELOGIO_MS)

const dados = computed(() => store.dados)
const grupos = computed(() => agruparRoteiro(dados.value?.itens ?? []))
const horarioCarga = computed(() => (store.carregadoEm ? formatarHora(store.carregadoEm) : ''))
const fase = computed(() => dados.value?.momento?.fase ?? null)
const momento = computed(() => {
  if (!dados.value?.momento || !store.carregadoEm) {
    return null
  }
  return interpolarMomento(dados.value.momento.agora, store.carregadoEm.getTime(), agoraDispositivo.value)
})
const minutoAtual = computed(() => (momento.value && dados.value ? minutoAtualNoRoteiro(momento.value, dados.value.casamento.data) : 0))
const itensPainel = computed(() => (dados.value ? itensPainelPublicos(dados.value.itens, dados.value.casamento.horarioCerimonia) : []))
const seloFase = computed(() => {
  const atual = dados.value?.momento
  if (!atual || atual.fase === 'NoDia') {
    return TEXTOS_GRANDE_DIA.aoVivo
  }
  return atual.fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.faltamDias(atual.diasParaOCasamento) : TEXTOS_GRANDE_DIA.diaPassou
})
const semConexaoComDados = computed(() => dados.value !== null && store.falha !== null && store.falha !== 'linkInativo')

const locais = computed<LocalOperacao[]>(() => {
  const casamento = dados.value?.casamento
  if (!casamento) {
    return []
  }
  const lista: LocalOperacao[] = []
  if (casamento.horarioCerimonia || casamento.localCerimonia) {
    lista.push({
      rotulo: TEXTOS_CRONOGRAMA_PUBLICO.cerimonia,
      valor: casamento.horarioCerimonia
        ? TEXTOS_CRONOGRAMA_PUBLICO.cerimoniaComHorario(casamento.horarioCerimonia, casamento.localCerimonia)
        : (casamento.localCerimonia ?? ''),
    })
  }
  if (casamento.localRecepcao) {
    lista.push({ rotulo: TEXTOS_CRONOGRAMA_PUBLICO.recepcao, valor: casamento.localRecepcao })
  }
  return lista
})

const estadoErro = computed(() => {
  if (dados.value !== null || store.falha === null) {
    return null
  }
  if (store.falha === 'linkInativo') {
    return { titulo: TEXTOS_CRONOGRAMA_PUBLICO.inativoTitulo, mensagem: TEXTOS_CRONOGRAMA_PUBLICO.inativoTexto, tentar: false }
  }
  if (store.falha === 'muitasTentativas') {
    return { titulo: TEXTOS_CRONOGRAMA_PUBLICO.limiteTitulo, mensagem: TEXTOS_CRONOGRAMA_PUBLICO.limiteTexto, tentar: true }
  }
  return { titulo: TEXTOS_CRONOGRAMA_PUBLICO.erroTitulo, mensagem: TEXTOS_CRONOGRAMA_PUBLICO.erroTexto, tentar: true }
})

function carregar() {
  void store.consultar(props.token)
}

watch(() => props.token, carregar, { immediate: true })

useAtualizacaoPeriodica(() => {
  if (dados.value !== null && store.falha !== 'linkInativo' && !store.carregando) {
    carregar()
  }
}, INTERVALO_ATUALIZACAO_PUBLICO_MS)

watch(
  () => store.falha,
  () => {
    document.title = TEXTOS_CRONOGRAMA_PUBLICO.tituloDocumento
  },
  { immediate: true },
)

onBeforeUnmount(() => store.limpar())
</script>

<template>
  <LayoutPublico variante="operacao">
    <EstadoCarregando
      v-if="store.carregando && !dados"
      variante="cartao"
      :linhas="4"
    />

    <EstadoErro
      v-else-if="estadoErro"
      :titulo="estadoErro.titulo"
      :mensagem="estadoErro.mensagem"
      :pode-tentar-novamente="estadoErro.tentar"
      data-teste="cronograma-publico-erro"
      @tentar-novamente="carregar"
    />

    <template v-else-if="dados">
      <CabecalhoOperacao
        :primeiro="dados.casamento.nomePrimeiraPessoa"
        :segundo="dados.casamento.nomeSegundaPessoa"
        :data="dados.casamento.data"
        :filtro="rotuloFiltro(dados)"
        :locais="locais"
      />

      <MensagemFormulario
        v-if="semConexaoComDados"
        variante="alerta"
        :mensagem="TEXTOS_CRONOGRAMA_PUBLICO.semConexao(horarioCarga)"
        data-teste="cronograma-publico-sem-conexao"
      />

      <template v-if="grupos.length > 0 && fase === 'NoDia'">
        <RelogioOperacao
          :hora="momento?.hora ?? ''"
          :selo="seloFase"
          ao-vivo
        />
        <PainelAgoraProximo
          :itens="itensPainel"
          :minuto-atual="minutoAtual"
          prefixo="cronograma-publico"
        />
      </template>

      <FaixaFaseDia
        v-else-if="grupos.length > 0 && fase !== null"
        :titulo="fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.antesTitulo : TEXTOS_GRANDE_DIA.depoisTitulo"
        :texto="fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.antesTexto : TEXTOS_GRANDE_DIA.depoisTexto"
      />

      <EstadoVazio
        v-if="grupos.length === 0"
        icone="cronograma"
        :titulo="TEXTOS_CRONOGRAMA_PUBLICO.vazioTitulo"
        :descricao="TEXTOS_CRONOGRAMA_PUBLICO.vazioTexto"
        data-teste="cronograma-publico-vazio"
      />

      <section
        v-for="grupo in grupos"
        :key="grupo.dia"
        class="cronograma-publico__dia"
        :aria-labelledby="`dia-roteiro-${grupo.dia}`"
        :data-teste="`dia-roteiro-${grupo.dia}`"
      >
        <h2
          :id="`dia-roteiro-${grupo.dia}`"
          class="cronograma-publico__titulo-dia"
        >
          {{ grupo.titulo }}
        </h2>
        <ol class="cronograma-publico__lista">
          <ItemRoteiro
            v-for="(item, indice) in grupo.itens"
            :key="`${item.inicio}-${indice}`"
            :inicio="item.inicio"
            :termino="item.termino"
            :termina-em-outro-dia="item.terminaEmOutroDia"
            :atividade="item.atividade"
            :local="item.local"
            :responsavel="item.responsavel"
            :fornecedor="item.fornecedor?.nomeEmpresa ?? null"
            :instrucoes="item.instrucoes"
            :concluido="item.status === 'Concluido'"
            :cerimonia="ehHorarioDaCerimonia(item, dados.casamento.horarioCerimonia)"
          />
        </ol>
      </section>

      <footer class="cronograma-publico__rodape">
        <p
          class="cronograma-publico__atualizado"
          role="status"
          aria-live="polite"
          data-teste="cronograma-publico-atualizado"
        >
          {{ TEXTOS_CRONOGRAMA_PUBLICO.atualizadoAs(horarioCarga) }}
        </p>
        <Button
          :label="store.carregando ? TEXTOS_CRONOGRAMA_PUBLICO.atualizando : TEXTOS_CRONOGRAMA_PUBLICO.atualizar"
          icon="ie ie-recarregar"
          severity="secondary"
          outlined
          :loading="store.carregando"
          data-teste="cronograma-publico-atualizar"
          @click="carregar"
        />
        <p class="cronograma-publico__nota">
          {{ TEXTOS_CRONOGRAMA_PUBLICO.nota(formatarDataCalendarioExtenso(dados.validoAte)) }}
        </p>
      </footer>
    </template>

    <template #rodape>
      <MarcaProduto
        somente-simbolo
        tom="claro"
      />
    </template>
  </LayoutPublico>
</template>

<style scoped>
.cronograma-publico__dia {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.cronograma-publico__dia + .cronograma-publico__dia {
  padding-top: var(--p-espaco-4);
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.cronograma-publico__titulo-dia {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-apoio);
}

.cronograma-publico__titulo-dia::first-letter {
  text-transform: uppercase;
}

.cronograma-publico__lista {
  margin: 0;
  padding: 0;
}

.cronograma-publico__rodape {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding-top: var(--p-espaco-5);
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.cronograma-publico__atualizado,
.cronograma-publico__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
}

.cronograma-publico__atualizado {
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-texto);
}
</style>
