<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

import { TEXTOS_PAINEL } from '@/textos/autenticacao'

const props = withDefaults(defineProps<{ nome: string; organizacao: string; saindo?: boolean; variante?: 'rail' | 'completa' }>(), {
  saindo: false,
  variante: 'completa',
})

const emit = defineEmits<{ sair: [] }>()

const iniciais = computed(() =>
  props.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toLocaleUpperCase('pt-BR'))
    .join(''),
)
</script>

<template>
  <div
    class="resumo-usuario"
    :class="`resumo-usuario--${variante}`"
    data-teste="resumo-usuario"
  >
    <span
      class="resumo-usuario__avatar"
      :title="`${nome} · ${organizacao}`"
      aria-hidden="true"
    >{{ iniciais }}</span>
    <div :class="variante === 'rail' ? 'somente-leitor-tela' : 'resumo-usuario__textos'">
      <span class="somente-leitor-tela">{{ TEXTOS_PAINEL.contaConectada }}:</span>
      <p class="resumo-usuario__nome">
        {{ nome }}
      </p>
      <p class="resumo-usuario__organizacao">
        {{ organizacao }}
      </p>
    </div>
    <Button
      class="resumo-usuario__sair"
      :label="variante === 'rail' ? undefined : TEXTOS_PAINEL.sair"
      :aria-label="variante === 'rail' ? TEXTOS_PAINEL.sair : undefined"
      icon="ie ie-sair"
      text
      :loading="saindo"
      data-teste="sair"
      @click="emit('sair')"
    />
  </div>
</template>

<style scoped>
.resumo-usuario {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-3);
  color: var(--p-cor-navegacao-texto);
}

.resumo-usuario--rail {
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.resumo-usuario__avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  background: var(--p-cor-primaria-suave);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-total);
}

.resumo-usuario__textos {
  flex: 1;
  min-width: 0;
}

.resumo-usuario__nome {
  overflow: hidden;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resumo-usuario__organizacao {
  overflow: hidden;
  font-size: var(--p-fonte-tamanho-apoio);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resumo-usuario .resumo-usuario__sair {
  min-height: var(--p-dimensao-alvo-toque);
  color: var(--p-cor-navegacao-texto);
}

.resumo-usuario .resumo-usuario__sair:hover {
  color: var(--p-cor-navegacao-ativo);
  background: var(--p-cor-superficie-sutil);
}

.resumo-usuario--rail .resumo-usuario__avatar {
  width: 2.25rem;
  height: 2.25rem;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-negrito);
  color: var(--p-cor-lateral-escura-texto);
  background: var(--p-cor-rail-avatar);
  border: 0;
}

.resumo-usuario--rail .resumo-usuario__sair {
  width: var(--p-dimensao-alvo-toque);
}
</style>
