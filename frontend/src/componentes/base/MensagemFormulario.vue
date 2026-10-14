<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ variante?: 'erro' | 'sucesso' | 'informacao' | 'alerta'; mensagem: string; id?: string }>(), {
  variante: 'erro',
  id: undefined,
})

const ICONES = {
  erro: 'ie ie-alerta',
  sucesso: 'ie ie-concluido',
  informacao: 'ie ie-informacao',
  alerta: 'ie ie-alerta',
} as const

const papel = computed(() => (props.variante === 'erro' ? 'alert' : 'status'))
</script>

<template>
  <div
    :id="id"
    class="mensagem-formulario"
    :class="`mensagem-formulario--${variante}`"
    :role="papel"
    tabindex="-1"
    data-teste="mensagem-formulario"
  >
    <span
      :class="['mensagem-formulario__icone', ICONES[variante]]"
      aria-hidden="true"
    />
    <div class="mensagem-formulario__corpo">
      <p>{{ mensagem }}</p>
      <div
        v-if="$slots.default"
        class="mensagem-formulario__extra"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mensagem-formulario {
  display: flex;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-3) var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: 1.5;
  border-radius: 8px;
}

.mensagem-formulario:focus {
  outline: none;
}

.mensagem-formulario__icone {
  margin-top: 0.125rem;
  font-size: 1.125rem;
}

.mensagem-formulario--erro {
  color: var(--p-cor-erro-texto);
  background: var(--p-cor-erro-suave);
}

.mensagem-formulario--sucesso {
  color: var(--p-cor-sucesso-texto);
  background: var(--p-cor-sucesso-suave);
}

.mensagem-formulario--informacao {
  color: var(--p-cor-informacao-texto);
  background: var(--p-cor-informacao-suave);
}

.mensagem-formulario--alerta {
  color: var(--p-cor-alerta-texto);
  background: var(--p-cor-alerta-suave);
}

.mensagem-formulario__corpo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  color: var(--p-cor-texto);
}

.mensagem-formulario--alerta .mensagem-formulario__corpo {
  color: var(--p-cor-alerta-forte);
}

.mensagem-formulario--alerta .mensagem-formulario__corpo > p {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.mensagem-formulario__extra {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-4);
}

.mensagem-formulario--alerta .mensagem-formulario__extra :deep(a) {
  font-weight: var(--p-fonte-peso-negrito);
  color: inherit;
}
</style>
