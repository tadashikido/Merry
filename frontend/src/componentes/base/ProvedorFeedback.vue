<script setup lang="ts">
import Toast from 'primevue/toast'

import DialogoAlteracoesNaoSalvas from './DialogoAlteracoesNaoSalvas.vue'
import DialogoExclusao from './DialogoExclusao.vue'
import { breakpoints } from '@/design/tokens'
import type { DadosToast } from '@/composables/useNotificacao'
import { ROTULOS_ACOES } from '@/textos/rotulos'

interface MensagemToast {
  severity?: string
  summary?: string
  detail?: string
  data?: DadosToast
}

const pontosQuebraToast = { [`${breakpoints.tablet - 1}px`]: { width: 'calc(100vw - 2rem)', left: '1rem', right: '1rem' } }

const ICONES: Record<string, string> = {
  success: 'ie-concluir',
  error: 'ie-alerta',
  warn: 'ie-prazo',
  info: 'ie-informacao',
}

function iconeDe(mensagem: MensagemToast): string {
  return ICONES[mensagem.severity ?? 'info'] ?? 'ie-informacao'
}

function desfazer(mensagem: MensagemToast, fechar: () => void) {
  const acao = mensagem.data?.desfazer
  void acao?.()
  fechar()
}

function habilitarPausaNoHover() {
  return undefined
}

function aoFecharToast(evento: { message: MensagemToast }) {
  void evento.message.data?.aoFechar?.()
}
</script>

<template>
  <Toast
    position="bottom-right"
    :breakpoints="pontosQuebraToast"
    class="provedor-toast"
    :on-mouse-enter="habilitarPausaNoHover"
    :on-mouse-leave="habilitarPausaNoHover"
    @close="aoFecharToast"
    @life-end="aoFecharToast"
  >
    <template #container="{ message, closeCallback }">
      <div
        class="toast-nossia"
        :class="`toast-nossia--${(message as MensagemToast).severity ?? 'info'}`"
        data-teste="toast"
      >
        <span
          :class="['ie', iconeDe(message as MensagemToast), 'toast-nossia__icone']"
          aria-hidden="true"
        />
        <div class="toast-nossia__textos">
          <p class="toast-nossia__resumo">
            {{ (message as MensagemToast).summary }}
          </p>
          <p
            v-if="(message as MensagemToast).detail"
            class="toast-nossia__detalhe"
          >
            {{ (message as MensagemToast).detail }}
          </p>
        </div>
        <button
          v-if="(message as MensagemToast).data?.desfazer"
          type="button"
          class="toast-nossia__desfazer"
          data-teste="toast-desfazer"
          @click="desfazer(message as MensagemToast, closeCallback)"
        >
          {{ ROTULOS_ACOES.desfazer }}
        </button>
        <button
          type="button"
          class="toast-nossia__fechar"
          :aria-label="ROTULOS_ACOES.fechar"
          @click="closeCallback"
        >
          <span
            class="ie ie-fechar"
            aria-hidden="true"
          />
        </button>
      </div>
    </template>
  </Toast>
  <DialogoExclusao />
  <DialogoAlteracoesNaoSalvas />
</template>

<style>
.provedor-toast .p-toast-message {
  background: var(--p-cor-toast);
  border: 0;
  border-radius: 8px;
  box-shadow: var(--p-sombra-sobreposicao);
}

.toast-nossia {
  display: flex;
  align-items: flex-start;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-3) var(--p-espaco-3) var(--p-espaco-3) var(--p-espaco-4);
  color: var(--p-cor-toast-texto);
}

.toast-nossia__icone {
  margin-top: 0.125rem;
  font-size: 1.125rem;
  color: var(--p-cor-toast-informacao);
}

.toast-nossia--success .toast-nossia__icone {
  color: var(--p-cor-toast-sucesso);
}

.toast-nossia--error .toast-nossia__icone {
  color: var(--p-cor-toast-erro);
}

.toast-nossia--warn .toast-nossia__icone {
  color: var(--p-cor-toast-alerta);
}

.toast-nossia__textos {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-top: 0.0625rem;
}

.toast-nossia__resumo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  line-height: 1.4;
}

.toast-nossia__detalhe {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: 1.45;
  color: var(--p-cor-toast-apoio);
}

.toast-nossia__desfazer,
.toast-nossia__fechar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  padding: 0 var(--p-espaco-2);
  font: inherit;
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-toast-acao);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--p-raio-controle);
}

.toast-nossia__fechar {
  color: var(--p-cor-toast-apoio);
}

.toast-nossia__desfazer:hover,
.toast-nossia__fechar:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
