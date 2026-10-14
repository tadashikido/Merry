<script setup lang="ts">
import { useId } from 'vue'

import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'

defineProps<{ diasRetencao: number }>()

const idTitulo = `${useId()}-aviso-privacidade`
</script>

<template>
  <section
    class="aviso-privacidade"
    :aria-labelledby="idTitulo"
    data-teste="aviso-privacidade"
  >
    <span
      class="aviso-privacidade__icone ie ie-permissao"
      aria-hidden="true"
    />
    <div class="aviso-privacidade__corpo">
      <h3
        :id="idTitulo"
        class="aviso-privacidade__titulo"
      >
        {{ TEXTOS_DADOS_SENSIVEIS.avisoTitulo }}
      </h3>
      <p class="aviso-privacidade__texto">
        {{ TEXTOS_DADOS_SENSIVEIS.avisoTexto(diasRetencao) }}
      </p>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.aviso-privacidade {
  display: flex;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
  background: var(--p-cor-fundo);
  border-radius: var(--p-raio-controle);
}

.aviso-privacidade__icone {
  margin-top: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.aviso-privacidade__corpo {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--p-espaco-2);
  min-width: 0;
}

.aviso-privacidade__titulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.aviso-privacidade__texto {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-apoio);
}
</style>
