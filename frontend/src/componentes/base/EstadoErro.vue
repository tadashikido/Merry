<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { ROTULOS_ACOES } from '@/textos/rotulos'

const props = withDefaults(
  defineProps<{ titulo?: string; mensagem?: string; podeTentarNovamente?: boolean; variante?: 'erro' | 'semPermissao' }>(),
  {
    titulo: MENSAGENS_PADRAO.erroGenericoTitulo,
    mensagem: MENSAGENS_PADRAO.erroGenericoMensagem,
    podeTentarNovamente: true,
    variante: 'erro',
  },
)

const emit = defineEmits<{ 'tentar-novamente': [] }>()

const icone = computed(() => (props.variante === 'semPermissao' ? 'ie-permissao' : 'ie-ocorrencia'))
</script>

<template>
  <section
    class="estado-erro"
    :class="`estado-erro--${variante}`"
    role="alert"
    data-teste="estado-erro"
    :data-variante="variante"
  >
    <span
      class="estado-erro__circulo"
      aria-hidden="true"
    >
      <span :class="['ie', icone]" />
    </span>
    <h2 class="estado-erro__titulo">
      {{ titulo }}
    </h2>
    <p class="estado-erro__mensagem">
      {{ mensagem }}
    </p>
    <Button
      v-if="podeTentarNovamente"
      class="estado-erro__acao"
      :label="ROTULOS_ACOES.tentarNovamente"
      severity="secondary"
      outlined
      data-teste="tentar-novamente"
      @click="emit('tentar-novamente')"
    />
  </section>
</template>

<style scoped>
.estado-erro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-10) var(--p-espaco-6);
  text-align: center;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.estado-erro__circulo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  font-size: 1.25rem;
  color: var(--p-cor-erro);
  background: var(--p-cor-erro-suave);
  border-radius: var(--p-raio-total);
}

.estado-erro--semPermissao .estado-erro__circulo {
  color: var(--p-cor-texto-secundario);
  background: var(--p-cor-neutro-suave);
}

.estado-erro .estado-erro__titulo {
  font-size: var(--p-fonte-tamanho-titulo);
  line-height: 1.35;
}

.estado-erro__mensagem {
  max-width: 28rem;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: 1.55;
  color: var(--p-cor-texto-secundario);
}

.estado-erro__acao {
  margin-top: var(--p-espaco-2);
  min-height: var(--p-dimensao-alvo-toque);
}
</style>
