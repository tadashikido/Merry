<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BarraAcaoFixa from '@/componentes/base/BarraAcaoFixa.vue'
import CabecalhoOperacao, { type LocalOperacao } from '@/componentes/base/CabecalhoOperacao.vue'
import ContatoUmToque from '@/componentes/base/ContatoUmToque.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import FaixaFaseDia from '@/componentes/base/FaixaFaseDia.vue'
import ItemRoteiro from '@/componentes/base/ItemRoteiro.vue'
import LinhaOperacao from '@/componentes/base/LinhaOperacao.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import PainelAgoraProximo from '@/componentes/base/PainelAgoraProximo.vue'
import RelogioOperacao from '@/componentes/base/RelogioOperacao.vue'
import SuperficieOperacao from '@/componentes/base/SuperficieOperacao.vue'
import { useAtualizacaoPeriodica, useRelogioDispositivo } from '@/composables/useAtualizacaoPeriodica'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useGrandeDiaStore } from '@/stores/grandeDia'
import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import type { ItemPainelGrandeDia } from '@/tipos/grandeDia'
import type { FalhaCasamento } from '@/stores/casamentos'
import { agruparRoteiro, ehHorarioDaCerimonia } from '@/utilitarios/cronogramaPublico'
import { formatarHora, formatarNomesCasal } from '@/utilitarios/formatacao'
import {
  distribuirPainel,
  horaLocalDoInstante,
  interpolarMomento,
  INTERVALO_ATUALIZACAO_INTERNO_MS,
  INTERVALO_RELOGIO_MS,
  itensPainelDoGrandeDia,
  minutoAtualNoRoteiro,
} from '@/utilitarios/grandeDia'

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const store = useGrandeDiaStore()
const notificacao = useNotificacao()
const agoraDispositivo = useRelogioDispositivo(INTERVALO_RELOGIO_MS)

const dados = computed(() => (store.casamentoId === props.id ? store.dados : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const fase = computed(() => dados.value?.momento.fase ?? null)
const noDia = computed(() => fase.value === 'NoDia')
const podeMarcar = computed(() => dados.value !== null && !dados.value.somenteLeitura && !autenticacao.ehCasal && noDia.value)
const itensPainel = computed(() => (dados.value ? itensPainelDoGrandeDia(dados.value.itens, dados.value.horarioCerimonia) : []))
const distribuicao = computed(() => distribuirPainel(itensPainel.value))
const grupos = computed(() => agruparRoteiro(dados.value?.itens ?? []))
const horaCarga = computed(() => (store.carregadoEm ? formatarHora(store.carregadoEm) : ''))

const momento = computed(() => {
  if (!dados.value || !store.carregadoEm) {
    return null
  }
  return interpolarMomento(dados.value.momento.agora, store.carregadoEm.getTime(), agoraDispositivo.value)
})
const minutoAtual = computed(() => (momento.value && dados.value ? minutoAtualNoRoteiro(momento.value, dados.value.data) : 0))

const selo = computed(() => {
  const atual = dados.value?.momento
  if (!atual || atual.fase === 'NoDia') {
    return TEXTOS_GRANDE_DIA.aoVivo
  }
  return atual.fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.faltamDias(atual.diasParaOCasamento) : TEXTOS_GRANDE_DIA.diaPassou
})

const locais = computed<LocalOperacao[]>(() => {
  const atual = dados.value
  if (!atual) {
    return []
  }
  const lista: LocalOperacao[] = []
  if (atual.horarioCerimonia || atual.localCerimonia) {
    lista.push({
      rotulo: TEXTOS_CRONOGRAMA_PUBLICO.cerimonia,
      valor: atual.horarioCerimonia
        ? TEXTOS_CRONOGRAMA_PUBLICO.cerimoniaComHorario(atual.horarioCerimonia, atual.localCerimonia)
        : (atual.localCerimonia ?? ''),
    })
  }
  if (atual.localRecepcao) {
    lista.push({ rotulo: TEXTOS_CRONOGRAMA_PUBLICO.recepcao, valor: atual.localRecepcao })
  }
  return lista
})

const estadoErro = computed(() => {
  if (dados.value !== null || falha.value === null || falha.value.tipo === 'naoEncontrado') {
    return null
  }
  if (falha.value.tipo === 'semPermissao') {
    return { titulo: TEXTOS_GRANDE_DIA.semPermissaoTitulo, mensagem: TEXTOS_GRANDE_DIA.semPermissaoTexto, variante: 'semPermissao' as const }
  }
  return { titulo: TEXTOS_GRANDE_DIA.erroTitulo, mensagem: TEXTOS_GRANDE_DIA.erroTexto, variante: 'erro' as const }
})

watch(
  () => props.id,
  (id) => {
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  dados,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_GRANDE_DIA.tituloDocumento(formatarNomesCasal(valor.nomePrimeiraPessoa, valor.nomeSegundaPessoa))
    }
  },
  { immediate: true },
)

useAtualizacaoPeriodica(() => store.atualizar(props.id), INTERVALO_ATUALIZACAO_INTERNO_MS)

onBeforeUnmount(() => store.limpar())

function atualizarAgora() {
  void store.atualizar(props.id)
}

function focarAgora() {
  void nextTick(() => document.getElementById('grande-dia-agora')?.focus())
}

function mensagemFalha(tipo: FalhaCasamento['tipo'], mensagem: string | null): string {
  if (tipo === 'conflito') {
    return TEXTOS_GRANDE_DIA.conflito
  }
  if (tipo === 'regra' && mensagem) {
    return mensagem
  }
  return TEXTOS_GRANDE_DIA.erroAcao
}

async function reabrir(item: ItemPainelGrandeDia) {
  const resultado = await store.reabrir(props.id, item.chave)
  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_GRANDE_DIA.sucessoReaberto(item.atividade))
    focarAgora()
    return
  }
  notificacao.erro(mensagemFalha(resultado.falha.tipo, resultado.falha.mensagem))
}

async function concluir(item: ItemPainelGrandeDia) {
  const resultado = await store.concluir(props.id, item.chave)
  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_GRANDE_DIA.sucessoFeito(item.atividade), { desfazer: () => reabrir(item) })
    focarAgora()
    return
  }
  notificacao.erro(mensagemFalha(resultado.falha.tipo, resultado.falha.mensagem))
}

function feitoAs(item: ItemPainelGrandeDia): string | null {
  const hora = horaLocalDoInstante(item.concluidoEm)
  return hora ? TEXTOS_GRANDE_DIA.feitoAs(hora) : TEXTOS_GRANDE_DIA.feito
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_GRANDE_DIA.naoEncontradoTitulo"
        :mensagem="TEXTOS_GRANDE_DIA.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="grande-dia__voltar"
        :to="autenticacao.casamentoDoCasal ? { name: 'casamento', params: { id: autenticacao.casamentoDoCasal } } : { name: 'casamentos' }"
        data-teste="voltar"
      >
        {{ autenticacao.casamentoDoCasal ? TEXTOS_GRANDE_DIA.voltarNossoCasamento : TEXTOS_GRANDE_DIA.voltarCasamentos }}
      </RouterLink>
    </template>

    <SuperficieOperacao v-else>
      <EstadoCarregando
        v-if="store.carregando && !dados"
        variante="cartao"
        :linhas="4"
      />

      <EstadoErro
        v-else-if="estadoErro"
        :titulo="estadoErro.titulo"
        :mensagem="estadoErro.mensagem"
        :variante="estadoErro.variante"
        :pode-tentar-novamente="estadoErro.variante === 'erro'"
        data-teste="grande-dia-erro"
        @tentar-novamente="store.carregar(id)"
      />

      <template v-else-if="dados">
        <CabecalhoOperacao
          :primeiro="dados.nomePrimeiraPessoa"
          :segundo="dados.nomeSegundaPessoa"
          :data="dados.data"
          :filtro="TEXTOS_GRANDE_DIA.subtitulo"
          :locais="locais"
        />

        <RelogioOperacao
          :hora="momento?.hora ?? ''"
          :selo="selo"
          :ao-vivo="noDia"
        />

        <MensagemFormulario
          v-if="dados.arquivado"
          variante="alerta"
          :mensagem="TEXTOS_GRANDE_DIA.arquivadoAcao"
          data-teste="grande-dia-arquivado"
        />

        <MensagemFormulario
          v-if="store.semConexao"
          variante="alerta"
          :mensagem="TEXTOS_GRANDE_DIA.semConexao(horaCarga)"
          data-teste="grande-dia-sem-conexao"
        />

        <EstadoVazio
          v-if="dados.itens.length === 0"
          icone="cronograma"
          :titulo="TEXTOS_GRANDE_DIA.vazioTitulo"
          :descricao="autenticacao.ehCasal ? TEXTOS_GRANDE_DIA.vazioTextoCasal : TEXTOS_GRANDE_DIA.vazioTexto"
          data-teste="grande-dia-vazio"
        >
          <template
            v-if="!autenticacao.ehCasal && !dados.arquivado"
            #acao
          >
            <RouterLink
              :to="{ name: 'casamento-cronograma', params: { id } }"
              data-teste="grande-dia-montar"
            >
              {{ TEXTOS_GRANDE_DIA.montarCronograma }}
            </RouterLink>
          </template>
        </EstadoVazio>

        <template v-else-if="noDia">
          <PainelAgoraProximo
            :itens="itensPainel"
            :minuto-atual="minutoAtual"
            prefixo="grande-dia"
          >
            <template #contatos="{ item }">
              <ContatoUmToque
                v-if="item.contato"
                :nome="item.contato.nome"
                :telefone="item.contato.telefone"
              />
            </template>
            <template
              v-if="podeMarcar"
              #acoes="{ item }"
            >
              <Button
                :label="TEXTOS_GRANDE_DIA.marcarFeitoCurto"
                :aria-label="TEXTOS_GRANDE_DIA.marcarFeitoAria(item.atividade)"
                icon="ie ie-concluir"
                severity="secondary"
                outlined
                size="small"
                :loading="store.itemEmAcao === item.chave"
                data-teste="grande-dia-feito-paralelo"
                @click="concluir(item)"
              />
            </template>
          </PainelAgoraProximo>

          <section
            v-if="distribuicao.semMarcar.length > 0"
            class="grande-dia__bloco"
            aria-labelledby="grande-dia-sem-marcar"
            data-teste="grande-dia-sem-marcar"
          >
            <h2
              id="grande-dia-sem-marcar"
              class="grande-dia__titulo"
            >
              {{ TEXTOS_GRANDE_DIA.semMarcar(distribuicao.semMarcar.length) }}
            </h2>
            <ul class="grande-dia__lista">
              <LinhaOperacao
                v-for="item in distribuicao.semMarcar"
                :key="item.chave"
                :inicio="item.inicio"
                :atividade="item.atividade"
              >
                <template
                  v-if="podeMarcar"
                  #acoes
                >
                  <Button
                    :label="TEXTOS_GRANDE_DIA.marcarFeitoCurto"
                    :aria-label="TEXTOS_GRANDE_DIA.marcarFeitoAria(item.atividade)"
                    icon="ie ie-concluir"
                    severity="secondary"
                    outlined
                    size="small"
                    :loading="store.itemEmAcao === item.chave"
                    data-teste="grande-dia-feito-pendente"
                    @click="concluir(item)"
                  />
                </template>
              </LinhaOperacao>
            </ul>
          </section>

          <details
            v-if="distribuicao.feitos.length > 0"
            class="grande-dia__feitos"
            data-teste="grande-dia-feitos"
          >
            <summary class="grande-dia__resumo">
              {{ TEXTOS_GRANDE_DIA.feitos(distribuicao.feitos.length) }}
            </summary>
            <ul class="grande-dia__lista">
              <LinhaOperacao
                v-for="item in distribuicao.feitos"
                :key="item.chave"
                :inicio="item.inicio"
                :atividade="item.atividade"
                :detalhe="feitoAs(item)"
                concluido
              >
                <template
                  v-if="podeMarcar"
                  #acoes
                >
                  <Button
                    :label="TEXTOS_GRANDE_DIA.reabrir"
                    :aria-label="TEXTOS_GRANDE_DIA.reabrirAria(item.atividade)"
                    severity="secondary"
                    text
                    size="small"
                    :loading="store.itemEmAcao === item.chave"
                    data-teste="grande-dia-reabrir"
                    @click="reabrir(item)"
                  />
                </template>
              </LinhaOperacao>
            </ul>
          </details>
        </template>

        <template v-else>
          <FaixaFaseDia
            :titulo="fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.antesTitulo : TEXTOS_GRANDE_DIA.depoisTitulo"
            :texto="fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.antesTexto : TEXTOS_GRANDE_DIA.depoisTexto"
          />
          <section
            v-for="grupo in grupos"
            :key="grupo.dia"
            class="grande-dia__bloco"
            :aria-labelledby="`grande-dia-roteiro-${grupo.dia}`"
            :data-teste="`grande-dia-roteiro-${grupo.dia}`"
          >
            <h2
              :id="`grande-dia-roteiro-${grupo.dia}`"
              class="grande-dia__titulo"
            >
              {{ grupo.titulo }}
            </h2>
            <ol class="grande-dia__lista">
              <ItemRoteiro
                v-for="item in grupo.itens"
                :key="item.id"
                :inicio="item.inicio"
                :termino="item.termino"
                :termina-em-outro-dia="item.terminaEmOutroDia"
                :atividade="item.atividade"
                :local="item.local"
                :responsavel="item.responsavel"
                :fornecedor="item.fornecedor?.nomeEmpresa ?? null"
                :instrucoes="item.instrucoes"
                :concluido="item.status === 'Concluido'"
                :cerimonia="ehHorarioDaCerimonia(item, dados.horarioCerimonia)"
              />
            </ol>
          </section>
        </template>

        <footer class="grande-dia__rodape">
          <p
            class="grande-dia__atualizado"
            role="status"
            aria-live="polite"
            data-teste="grande-dia-atualizado"
          >
            {{ TEXTOS_GRANDE_DIA.atualizadoAs(horaCarga) }}
          </p>
          <Button
            :label="store.atualizando ? TEXTOS_GRANDE_DIA.atualizando : TEXTOS_GRANDE_DIA.atualizar"
            icon="ie ie-recarregar"
            severity="secondary"
            outlined
            size="small"
            :loading="store.atualizando"
            data-teste="grande-dia-atualizar"
            @click="atualizarAgora"
          />
        </footer>

        <BarraAcaoFixa
          v-if="podeMarcar && distribuicao.principal"
          variante="operacao"
        >
          <Button
            :label="TEXTOS_GRANDE_DIA.marcarFeito"
            :aria-label="TEXTOS_GRANDE_DIA.marcarFeitoAria(distribuicao.principal.atividade)"
            icon="ie ie-concluir"
            :loading="store.itemEmAcao === distribuicao.principal.chave"
            data-teste="grande-dia-marcar-feito"
            @click="concluir(distribuicao.principal)"
          />
        </BarraAcaoFixa>
      </template>
    </SuperficieOperacao>
  </LayoutPainelUsuario>
</template>

<style scoped>
.grande-dia__voltar {
  align-self: flex-start;
}

.grande-dia__bloco {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.grande-dia__titulo,
.grande-dia__resumo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-apoio);
}

.grande-dia__titulo::first-letter {
  text-transform: uppercase;
}

.grande-dia__resumo {
  display: flex;
  align-items: center;
  min-height: var(--p-dimensao-alvo-toque-movel);
  cursor: pointer;
}

.grande-dia__lista {
  margin: 0;
  padding: 0;
}

.grande-dia__feitos {
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.grande-dia__rodape {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-3);
  align-items: center;
  justify-content: space-between;
  padding-top: var(--p-espaco-4);
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.grande-dia__atualizado {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-apoio);
}
</style>
