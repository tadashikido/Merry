<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ListaDetalhes from '@/componentes/base/ListaDetalhes.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import BlocoAcessoAnfitriao from '@/componentes/acessoAnfitriao/BlocoAcessoAnfitriao.vue'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import BlocoConvidados from '@/componentes/convidados/BlocoConvidados.vue'
import AndamentoEvento from '@/componentes/eventos/AndamentoEvento.vue'
import BlocoProximosPassos from '@/componentes/eventos/BlocoProximosPassos.vue'
import type { ItemDetalhe } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_AREA_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { ROTULOS_FASE, TEXTOS_EVENTOS, VARIANTE_FASE } from '@/textos/eventos'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import {
  formatarDataCalendarioComDiaSemana,
  formatarDataCalendarioExtenso,
  formatarNomesAnfitrioes,
  formatarNumero,
} from '@/utilitarios/formatacao'

const props = defineProps<{ id: string }>()

const store = useEventosStore()
const financeiro = useFinanceiroStore()
const autenticacao = useAutenticacaoStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const processando = ref(false)

const evento = computed(() => (store.atual?.id === props.id ? store.atual : null))
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

const podeEditar = computed(() => !autenticacao.ehAnfitriao && Boolean(evento.value && !evento.value.arquivado))

const vocabulario = computed(() => vocabularioOuNeutro(evento.value?.tipo))

const exibeProximosPassos = computed(() => !autenticacao.ehAnfitriao && Boolean(evento.value && !evento.value.arquivado))
const exibeTopo = computed(() => Boolean(evento.value && !evento.value.arquivado))

const dadosFaltantes = computed(() => {
  const atual = evento.value
  if (!atual || !podeEditar.value) {
    return []
  }
  return [
    ...(atual.horario ? [] : [{ ...TEXTOS_EVENTOS.faltaHorario, titulo: vocabulario.value.faltaHorario }]),
    ...(atual.localCerimonia ? [] : [{ ...TEXTOS_EVENTOS.faltaLocal, titulo: vocabulario.value.faltaLocal }]),
  ]
})

const detalhes = computed<ItemDetalhe[]>(() => {
  const atual = evento.value
  if (!atual) {
    return []
  }
  return [
    { rotulo: TEXTOS_EVENTOS.data, valor: formatarDataCalendarioExtenso(atual.data) },
    { rotulo: vocabulario.value.horario, valor: atual.horario },
    { rotulo: vocabulario.value.locais.campoPrincipal, valor: atual.localCerimonia },
    { rotulo: vocabulario.value.locais.campoSecundario, valor: atual.localRecepcao },
    { rotulo: TEXTOS_EVENTOS.convidados, valor: atual.convidadosEstimados === null ? null : formatarNumero(atual.convidadosEstimados) },
    ...(autenticacao.ehAnfitriao ? [] : [{ rotulo: TEXTOS_EVENTOS.observacoes, valor: atual.observacoes, multilinha: true }]),
  ]
})

watch(
  () => props.id,
  (id) => {
    void store.obter(id)
    void financeiro.carregarAlertasEvento(id)
  },
  { immediate: true },
)

watch(nomes, (valor) => {
  if (valor) {
    document.title = TEXTOS_EVENTOS.tituloDocumento(valor)
  }
}, { immediate: true })

async function alternarArquivamento() {
  const atual = evento.value
  if (!atual) {
    return
  }
  processando.value = true
  const resultado = atual.arquivado ? await store.restaurar(atual.id) : await store.arquivar(atual.id)
  processando.value = false

  if (resultado.ok) {
    if (resultado.valor.arquivado) {
      notificacao.sucesso(TEXTOS_EVENTOS.arquivado(nomes.value), { desfazer: () => desfazerArquivamento(resultado.valor.id) })
    } else {
      notificacao.sucesso(TEXTOS_EVENTOS.restaurado(nomes.value))
    }
    return
  }

  if (resultado.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_EVENTOS.semPermissao)
    return
  }
  notificacao.erro()
}

async function desfazerArquivamento(id: string) {
  const resultado = await store.restaurar(id)
  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_EVENTOS.restaurado(nomes.value))
    return
  }
  notificacao.erro()
}
</script>

<template>
  <LayoutPainelUsuario>
    <EstadoCarregando
      v-if="store.carregandoAtual && !evento"
      variante="cartao"
      :linhas="2"
    />

    <div
      v-else-if="store.falhaAtual"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        v-if="store.falhaAtual.tipo === 'naoEncontrado'"
        :titulo="TEXTOS_EVENTOS.naoEncontradoTitulo"
        :mensagem="TEXTOS_EVENTOS.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <EstadoErro
        v-else
        :titulo="TEXTOS_EVENTOS.erroCarregarUmTitulo"
        :mensagem="store.falhaAtual.tipo === 'semPermissao' ? TEXTOS_EVENTOS.semAcesso : TEXTOS_EVENTOS.erroCarregarTexto"
        :variante="store.falhaAtual.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
        :pode-tentar-novamente="store.falhaAtual.tipo !== 'semPermissao'"
        @tentar-novamente="store.obter(id)"
      />
      <RouterLink
        v-if="autenticacao.ehAnfitriao && autenticacao.eventoDoAnfitriao"
        class="evento__voltar"
        :to="{ name: 'evento', params: { id: autenticacao.eventoDoAnfitriao } }"
        data-teste="voltar-nosso-evento"
      >
        {{ TEXTOS_AREA_ANFITRIAO.voltarNossoEvento }}
      </RouterLink>
      <RouterLink
        v-else
        class="evento__voltar"
        :to="{ name: 'eventos' }"
        data-teste="voltar-eventos"
      >
        {{ TEXTOS_EVENTOS.voltarLista }}
      </RouterLink>
    </div>

    <template v-else-if="evento">
      <CabecalhoPagina
        :titulo="nomes"
        tamanho="display"
      >
        <template #titulo>
          <NomesAnfitrioes
            :primeiro="evento.nomePrimeiraPessoa"
            :segundo="evento.nomeSegundaPessoa"
            tamanho="display"
          />
        </template>
        <template #detalhes>
          <span data-teste="tipo-evento">{{ vocabulario.rotulo }}</span>
          <span class="numeros-tabulares evento__quando">{{ quando }}</span>
          <span v-if="evento.localCerimonia">{{ evento.localCerimonia }}</span>
          <span class="evento__situacao">
            <BadgeStatus
              :texto="ROTULOS_FASE[evento.fase]"
              :variante="VARIANTE_FASE[evento.fase]"
            />
            <BadgeStatus
              v-if="evento.arquivado"
              :texto="TEXTOS_EVENTOS.statusArquivado"
              icone="arquivar"
            />
          </span>
        </template>
        <template #destaque>
          <ContagemRegressiva
            :dias="evento.diasRestantes"
            variante="cabecalho"
            :referencia="vocabulario.referencia.artigo"
          />
        </template>
        <template
          v-if="!autenticacao.ehAnfitriao"
          #acoes
        >
          <Button
            :label="TEXTOS_DUPLICACAO_EVENTO.acaoDuplicar"
            :aria-label="TEXTOS_DUPLICACAO_EVENTO.acaoDuplicarAcessivel(nomes)"
            icon="ie ie-copiar"
            severity="secondary"
            outlined
            data-teste="duplicar-evento"
            @click="roteador.push({ name: 'evento-duplicar', query: { origem: evento.id } })"
          />
          <Button
            :label="evento.arquivado ? TEXTOS_EVENTOS.restaurar : TEXTOS_EVENTOS.arquivar"
            :icon="evento.arquivado ? 'ie ie-restaurar' : 'ie ie-arquivar'"
            :severity="evento.arquivado ? undefined : 'secondary'"
            :outlined="!evento.arquivado"
            :loading="processando"
            :data-teste="evento.arquivado ? 'restaurar-evento' : 'arquivar-evento'"
            @click="alternarArquivamento"
          />
          <Button
            v-if="!evento.arquivado"
            :label="TEXTOS_EVENTOS.editarEvento"
            icon="ie ie-editar"
            data-teste="editar-evento"
            @click="roteador.push({ name: 'evento-editar', params: { id: evento.id } })"
          />
        </template>
      </CabecalhoPagina>

      <div class="evento pilha pilha--bloco">
        <div
          v-if="evento.arquivado || dadosFaltantes.length > 0"
          class="pilha pilha--grupo"
        >
          <MensagemFormulario
            v-if="evento.arquivado"
            variante="informacao"
            :mensagem="TEXTOS_EVENTOS.avisoArquivado"
            data-teste="aviso-arquivado"
          />

          <MensagemFormulario
            v-for="faltante in dadosFaltantes"
            :key="faltante.titulo"
            variante="alerta"
            :mensagem="faltante.titulo"
            data-teste="dados-incompletos"
          >
            <span>{{ faltante.texto }}</span>
            <RouterLink :to="{ name: 'evento-editar', params: { id: evento.id } }">
              {{ faltante.acao }}
            </RouterLink>
          </MensagemFormulario>
        </div>

        <div
          class="evento__painel"
          :class="{ 'evento__painel--sem-topo': !exibeTopo }"
          data-teste="painel-evento"
        >
          <div
            v-if="exibeTopo"
            class="evento__topo pilha pilha--bloco"
          >
            <BlocoProximosPassos
              v-if="exibeProximosPassos"
              :evento-id="evento.id"
            />
            <AndamentoEvento
              :evento-id="evento.id"
              :tipo="evento.tipo"
              :data="evento.data"
              :dias-restantes="evento.diasRestantes"
              :data-limite-rsvp-efetiva="evento.dataLimiteRsvpEfetiva"
              :percentual-checklist="evento.percentualChecklist"
              :exibir-checklist="!autenticacao.ehAnfitriao"
            />
          </div>

          <div
            class="evento__resumo"
            data-teste="resumo-evento"
          >
            <BlocoAlertasPagamentos
              v-if="!evento.arquivado"
              :alertas="financeiro.eventoAlertas === evento.id ? financeiro.alertasEvento : null"
              contexto="evento"
              :carregando="financeiro.carregandoAlertasEvento"
              :com-erro="financeiro.eventoAlertas === evento.id && financeiro.falhaAlertasEvento !== null"
              :destino-financeiro="{ name: 'evento-financeiro', params: { id: evento.id } }"
              @tentar-novamente="financeiro.carregarAlertasEvento(evento.id)"
            />
  
            <section
              class="cartao pilha pilha--campo"
              aria-labelledby="titulo-detalhes"
              data-teste="detalhes-evento"
            >
              <h2 id="titulo-detalhes">
                {{ TEXTOS_EVENTOS.detalhesTitulo }}
              </h2>
              <ListaDetalhes
                :itens="detalhes"
                embutida
              />
            </section>
          </div>

          <div class="evento__base pilha pilha--bloco">
            <BlocoConvidados
              :evento-id="evento.id"
              :arquivado="evento.arquivado"
              :convidados-estimados="evento.convidadosEstimados"
            />

            <BlocoAcessoAnfitriao
              v-if="!autenticacao.ehAnfitriao"
              :evento-id="evento.id"
              :arquivado="evento.arquivado"
            />
          </div>
        </div>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.evento__quando::first-letter {
  text-transform: uppercase;
}

.evento__situacao {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
}

.evento {
  container: evento / inline-size;
}

.evento__painel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.evento__resumo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(28rem, 100%), 1fr));
  gap: var(--p-ritmo-cartao);
  align-items: start;
}

@container evento (min-width: 64rem) {
  .evento__painel {
    grid-template-columns: minmax(0, 1fr) minmax(var(--p-dimensao-largura-gaveta), var(--p-dimensao-largura-autenticacao));
    grid-template-rows: auto 1fr;
  }

  .evento__topo {
    grid-column: 1;
    grid-row: 1;
  }

  .evento__resumo {
    grid-template-columns: minmax(0, 1fr);
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .evento__base {
    grid-column: 1;
    grid-row: 2;
  }

  .evento__painel--sem-topo .evento__base {
    grid-row: 1 / span 2;
  }
}

.evento__voltar {
  align-self: flex-start;
}
</style>
