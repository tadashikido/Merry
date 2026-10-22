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
import type { FalhaEvento } from '@/stores/eventos'
import { agruparRoteiro, ehHorarioDaCerimonia } from '@/utilitarios/cronogramaPublico'
import { formatarHora, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
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

const dados = computed(() => (store.eventoId === props.id ? store.dados : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))
const fase = computed(() => dados.value?.momento.fase ?? null)
const noDia = computed(() => fase.value === 'NoDia')
const podeMarcar = computed(() => dados.value !== null && !dados.value.somenteLeitura && !autenticacao.ehAnfitriao && noDia.value)
const itensPainel = computed(() => (dados.value ? itensPainelDoGrandeDia(dados.value.itens, dados.value.horarioCerimonia) : []))
const distribuicao = computed(() => distribuirPainel(itensPainel.value))
const grupos = computed(() => agruparRoteiro(dados.value?.itens ?? []))
const temLateral = computed(() => distribuicao.value.semMarcar.length > 0 || distribuicao.value.feitos.length > 0)
const temAcaoPrincipal = computed(() => podeMarcar.value && distribuicao.value.principal !== null)
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
  return atual.fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.faltamDias(atual.diasParaOEvento) : TEXTOS_GRANDE_DIA.diaPassou
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
      document.title = TEXTOS_GRANDE_DIA.tituloDocumento(formatarNomesAnfitrioes(valor.nomePrimeiraPessoa, valor.nomeSegundaPessoa))
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

function mensagemFalha(tipo: FalhaEvento['tipo'], mensagem: string | null): string {
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
    <div
      v-if="falha?.tipo === 'naoEncontrado'"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        :titulo="TEXTOS_GRANDE_DIA.naoEncontradoTitulo"
        :mensagem="TEXTOS_GRANDE_DIA.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="grande-dia__voltar"
        :to="autenticacao.eventoDoAnfitriao ? { name: 'evento', params: { id: autenticacao.eventoDoAnfitriao } } : { name: 'eventos' }"
        data-teste="voltar"
      >
        {{ autenticacao.eventoDoAnfitriao ? TEXTOS_GRANDE_DIA.voltarNossoEvento : TEXTOS_GRANDE_DIA.voltarEventos }}
      </RouterLink>
    </div>

    <SuperficieOperacao
      v-else
      class="grande-dia-superficie"
      ampla
    >
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

      <div
        v-else-if="dados"
        class="grande-dia"
        :class="{
          'grande-dia--com-lateral': noDia && temLateral,
          'grande-dia--com-acao': temAcaoPrincipal,
        }"
        data-teste="grande-dia"
      >
        <div class="grande-dia__topo">
          <div class="grande-dia__identificacao">
            <CabecalhoOperacao
              :primeiro="dados.nomePrimeiraPessoa"
              :segundo="dados.nomeSegundaPessoa"
              :data="dados.data"
              :filtro="TEXTOS_GRANDE_DIA.subtitulo"
              :locais="locais"
            />

            <RelogioOperacao
              class="grande-dia__relogio"
              :hora="momento?.hora ?? ''"
              :selo="selo"
              :ao-vivo="noDia"
            />
          </div>

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
        </div>

        <EstadoVazio
          v-if="dados.itens.length === 0"
          class="grande-dia__painel"
          icone="cronograma"
          :titulo="TEXTOS_GRANDE_DIA.vazioTitulo"
          :descricao="autenticacao.ehAnfitriao ? TEXTOS_GRANDE_DIA.vazioTextoAnfitriao : TEXTOS_GRANDE_DIA.vazioTexto"
          data-teste="grande-dia-vazio"
        >
          <template
            v-if="!autenticacao.ehAnfitriao && !dados.arquivado"
            #acao
          >
            <RouterLink
              :to="{ name: 'evento-cronograma', params: { id } }"
              data-teste="grande-dia-montar"
            >
              {{ TEXTOS_GRANDE_DIA.montarCronograma }}
            </RouterLink>
          </template>
        </EstadoVazio>

        <template v-else-if="noDia">
          <PainelAgoraProximo
            class="grande-dia__painel"
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

          <div
            v-if="temLateral"
            class="grande-dia__lateral"
          >
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
          </div>
        </template>

        <div
          v-else
          class="grande-dia__painel grande-dia__fase"
        >
          <FaixaFaseDia
            :titulo="fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.antesTitulo : TEXTOS_GRANDE_DIA.depoisTitulo"
            :texto="fase === 'AntesDoDia' ? TEXTOS_GRANDE_DIA.antesTexto : TEXTOS_GRANDE_DIA.depoisTexto"
          />
          <div class="grande-dia__roteiro">
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
          </div>
        </div>

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
          class="grande-dia__acao"
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
      </div>
    </SuperficieOperacao>
  </LayoutPainelUsuario>
</template>

<style scoped>
.grande-dia-superficie {
  container: grande-dia / inline-size;
}

.grande-dia {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
  min-width: 0;
}

.grande-dia__voltar {
  align-self: flex-start;
}

.grande-dia__topo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.grande-dia__identificacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.grande-dia__lateral,
.grande-dia__fase {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
  min-width: 0;
}

.grande-dia__roteiro {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr));
  gap: var(--p-ritmo-cartao) var(--p-ritmo-bloco);
  align-items: start;
}

.grande-dia__bloco {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
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
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  align-items: center;
  justify-content: space-between;
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.grande-dia__atualizado {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-apoio);
}

@container grande-dia (min-width: 40rem) {
  .grande-dia__rodape {
    order: 1;
  }
}

@container grande-dia (min-width: 60rem) {
  .grande-dia__identificacao {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0;
    align-items: end;
  }

  .grande-dia__relogio {
    align-self: stretch;
    align-items: flex-end;
    padding-left: var(--p-ritmo-bloco);
    padding-bottom: var(--p-espaco-5);
    border-bottom: 1px solid var(--p-cor-operacao-divisoria);
  }

  .grande-dia--com-lateral {
    display: grid;
    grid-template-areas:
      'topo topo'
      'painel lateral'
      'rodape rodape';
    grid-template-columns: minmax(0, 3fr) minmax(20rem, 2fr);
    gap: var(--p-ritmo-bloco);
    align-items: start;
  }

  .grande-dia--com-lateral.grande-dia--com-acao {
    grid-template-areas:
      'topo topo'
      'painel lateral'
      'acao lateral'
      'vago lateral'
      'rodape rodape';
    grid-template-rows: auto auto auto 1fr auto;
    row-gap: var(--p-ritmo-cartao);
  }

  .grande-dia--com-lateral .grande-dia__topo {
    grid-area: topo;
  }

  .grande-dia--com-lateral .grande-dia__painel {
    grid-area: painel;
  }

  .grande-dia--com-lateral .grande-dia__lateral {
    grid-area: lateral;
    padding: var(--p-ritmo-cartao);
    background: var(--p-cor-operacao-superficie);
    border-radius: var(--p-raio-painel);
  }

  .grande-dia--com-lateral .grande-dia__rodape {
    grid-area: rodape;
  }

  .grande-dia--com-lateral .grande-dia__acao {
    grid-area: acao;
  }
}
</style>
