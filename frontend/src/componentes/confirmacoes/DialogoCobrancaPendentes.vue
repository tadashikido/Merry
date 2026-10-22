<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import { breakpoints, dimensoes } from '@/design/tokens'
import { TEXTOS_COBRANCA } from '@/textos/confirmacoes'
import { ROTULOS_STATUS_ENVIO } from '@/textos/convidados'
import { TEXTOS_ENVIO_CONVITE, VARIANTE_STATUS_ENVIO } from '@/textos/rsvp'
import type { EventoDto } from '@/tipos/eventos'
import type { ConvitePendenteDto } from '@/tipos/confirmacoes'
import { cobradoHoje, contarCobradosHoje, filtrarPendentes, textoUltimaCobranca } from '@/utilitarios/painelConfirmacoes'
import { formatarDiaMes, montarMensagemLembrete } from '@/utilitarios/rsvp'

const props = defineProps<{
  visivel: boolean
  fila: ConvitePendenteDto[]
  evento: EventoDto | null
  conviteEmAndamento: string | null
  anuncio: string
}>()

const emit = defineEmits<{
  'update:visivel': [valor: boolean]
  whatsapp: [pendente: ConvitePendenteDto]
  copiar: [pendente: ConvitePendenteDto]
  registrar: [pendente: ConvitePendenteDto]
}>()

const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: '100vw' }
const busca = ref('')
const expandidos = ref<Set<string>>(new Set())
const agora = ref(new Date())

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => emit('update:visivel', valor),
})

watch(
  () => props.visivel,
  (visivel) => {
    if (visivel) {
      busca.value = ''
      expandidos.value = new Set()
      agora.value = new Date()
    }
  },
)

watch(
  () => props.fila,
  () => {
    agora.value = new Date()
  },
)

const filtrados = computed(() => filtrarPendentes(props.fila, busca.value))
const prazo = computed(() => (props.evento ? formatarDiaMes(props.evento.dataLimiteRsvpEfetiva) : ''))
const resumo = computed(() => TEXTOS_COBRANCA.resumo(props.fila.length, contarCobradosHoje(props.fila, agora.value)))

function alternarPrevia(conviteId: string) {
  const proximos = new Set(expandidos.value)
  if (proximos.has(conviteId)) {
    proximos.delete(conviteId)
  } else {
    proximos.add(conviteId)
  }
  expandidos.value = proximos
}

function previa(pendente: ConvitePendenteDto): string {
  return props.evento ? montarMensagemLembrete(props.evento, pendente, TEXTOS_COBRANCA.previaLink) : ''
}

function ocupado(pendente: ConvitePendenteDto): boolean {
  return props.conviteEmAndamento !== null && props.conviteEmAndamento !== pendente.conviteId
}

function rotulo(acao: string, pendente: ConvitePendenteDto): string {
  return TEXTOS_ENVIO_CONVITE.acaoComNome(acao, pendente.nome)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    modal
    :header="TEXTOS_COBRANCA.titulo"
    :draggable="false"
    :style="{ width: dimensoes.larguraLeitura }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-cobranca"
  >
    <div class="cobranca">
      <div class="cobranca__topo">
        <p class="cobranca__apoio">
          {{ TEXTOS_COBRANCA.apoio(prazo) }}
        </p>
        <p
          class="cobranca__resumo numeros-tabulares"
          data-teste="cobranca-resumo"
        >
          {{ resumo }}
        </p>
      </div>

      <EstadoVazio
        v-if="fila.length === 0"
        :titulo="TEXTOS_COBRANCA.vazioTitulo"
        :descricao="TEXTOS_COBRANCA.vazioTexto"
        icone="mensagem"
        data-teste="cobranca-vazia"
      />

      <template v-else>
        <InputText
          v-model="busca"
          type="search"
          class="cobranca__busca"
          :placeholder="TEXTOS_COBRANCA.buscaPlaceholder"
          :aria-label="TEXTOS_COBRANCA.buscaRotulo"
          data-teste="cobranca-busca"
        />

        <p
          v-if="filtrados.length === 0"
          class="cobranca__sem-resultado"
          data-teste="cobranca-sem-resultado"
        >
          {{ TEXTOS_COBRANCA.vazioBusca(busca) }}
        </p>

        <ul
          v-else
          class="cobranca__fila"
          :aria-label="TEXTOS_COBRANCA.filaRotulo"
        >
          <li
            v-for="pendente in filtrados"
            :key="pendente.conviteId"
            class="cobranca__item"
            data-teste="cobranca-item"
          >
            <div class="cobranca__cabecalho">
              <h3 class="cobranca__nome">
                {{ pendente.nome }}
              </h3>
              <BadgeStatus
                :texto="ROTULOS_STATUS_ENVIO[pendente.statusEnvio]"
                :variante="VARIANTE_STATUS_ENVIO[pendente.statusEnvio]"
              />
            </div>
            <p class="cobranca__detalhe">
              <span>{{ TEXTOS_COBRANCA.falta(pendente.pessoasPendentes.join(', ')) }}</span>
              <span
                :class="['cobranca__ultima', { 'cobranca__ultima--hoje': cobradoHoje(pendente.ultimaCobrancaEm, agora) }]"
                data-teste="cobranca-ultima"
              >
                {{ textoUltimaCobranca(pendente.ultimaCobrancaEm, agora) }}
                <template v-if="pendente.quantidadeCobrancas > 1">
                  {{ TEXTOS_COBRANCA.quantidade(pendente.quantidadeCobrancas) }}
                </template>
              </span>
            </p>

            <div class="cobranca__acoes">
              <Button
                :label="TEXTOS_COBRANCA.abrirWhatsApp"
                :aria-label="rotulo(TEXTOS_COBRANCA.abrirWhatsApp, pendente)"
                icon="ie ie-whatsapp"
                :loading="conviteEmAndamento === pendente.conviteId"
                :disabled="ocupado(pendente)"
                data-teste="cobranca-whatsapp"
                @click="emit('whatsapp', pendente)"
              />
              <Button
                :label="TEXTOS_COBRANCA.copiarLembrete"
                :aria-label="rotulo(TEXTOS_COBRANCA.copiarLembrete, pendente)"
                icon="ie ie-copiar"
                severity="secondary"
                outlined
                :disabled="conviteEmAndamento !== null"
                data-teste="cobranca-copiar"
                @click="emit('copiar', pendente)"
              />
              <Button
                :label="TEXTOS_COBRANCA.marcarEnviado"
                :aria-label="rotulo(TEXTOS_COBRANCA.marcarEnviado, pendente)"
                icon="ie ie-concluir"
                severity="secondary"
                text
                :disabled="conviteEmAndamento !== null"
                data-teste="cobranca-registrar"
                @click="emit('registrar', pendente)"
              />
            </div>

            <button
              type="button"
              class="cobranca__alternar"
              :aria-expanded="expandidos.has(pendente.conviteId)"
              :aria-controls="`previa-${pendente.conviteId}`"
              data-teste="cobranca-alternar-previa"
              @click="alternarPrevia(pendente.conviteId)"
            >
              <span
                :class="['ie', expandidos.has(pendente.conviteId) ? 'ie-seta-baixo' : 'ie-seta-direita']"
                aria-hidden="true"
              />
              {{ expandidos.has(pendente.conviteId) ? TEXTOS_COBRANCA.ocultarLembrete : TEXTOS_COBRANCA.verLembrete }}
            </button>
            <blockquote
              v-if="expandidos.has(pendente.conviteId)"
              :id="`previa-${pendente.conviteId}`"
              class="cobranca__previa"
              data-teste="cobranca-previa"
            >
              {{ previa(pendente) }}
            </blockquote>
          </li>
        </ul>
      </template>

      <p
        class="cobranca__anuncio"
        role="status"
        aria-live="polite"
      >
        {{ anuncio }}
      </p>
    </div>

    <template #footer>
      <Button
        :label="TEXTOS_COBRANCA.fechar"
        severity="secondary"
        outlined
        data-teste="cobranca-fechar"
        @click="aberto = false"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.cobranca {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.cobranca__topo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.cobranca__apoio {
  color: var(--p-cor-texto);
}

.cobranca__resumo,
.cobranca__sem-resultado {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.cobranca__busca {
  width: 100%;
}

.cobranca__fila {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cobranca__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-4) 0;
  border-top: 1px solid var(--p-cor-divisoria);
}

.cobranca__item:last-child {
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.cobranca__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-2);
}

.cobranca__nome {
  min-width: 0;
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.cobranca__detalhe {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.cobranca__ultima {
  color: var(--p-cor-texto-apoio);
}

.cobranca__ultima--hoje {
  color: var(--p-cor-acento-texto);
  font-weight: var(--p-fonte-peso-medio);
}

.cobranca__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.cobranca__alternar {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--p-espaco-1);
  min-height: 2.75rem;
  padding: 0;
  font: inherit;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-primaria-escura);
  background: none;
  border: 0;
  cursor: pointer;
}

.cobranca__alternar:focus-visible {
  outline: 2px solid var(--p-cor-primaria);
  outline-offset: 2px;
  border-radius: var(--p-raio-painel);
}

.cobranca__previa {
  margin: 0;
  padding: var(--p-espaco-3) var(--p-espaco-4);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie-sutil);
  border-left: 3px solid var(--p-cor-primaria);
  border-radius: 0 var(--p-raio-painel) var(--p-raio-painel) 0;
  overflow-wrap: anywhere;
}

.cobranca__anuncio {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 639px) {
  .cobranca__acoes > * {
    flex: 1 1 100%;
  }
}
</style>
