<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import { urlTelefone, urlWhatsapp } from '@/utilitarios/fornecedores'

const props = withDefaults(defineProps<{ nome: string; telefone?: string | null }>(), { telefone: null })

const ligar = computed(() => urlTelefone(props.telefone))
const whatsapp = computed(() => urlWhatsapp(props.telefone))
</script>

<template>
  <ul
    v-if="ligar || whatsapp"
    class="contato-um-toque"
    :aria-label="TEXTOS_GRANDE_DIA.contatos(nome)"
    data-teste="contato-um-toque"
  >
    <li v-if="ligar">
      <a
        class="contato-um-toque__acao"
        :href="ligar"
        :aria-label="TEXTOS_GRANDE_DIA.ligarAria(nome)"
        data-canal="telefone"
        data-teste="contato-ligar"
      >
        <span
          class="ie ie-telefone"
          aria-hidden="true"
        />
        {{ TEXTOS_GRANDE_DIA.ligar }}
      </a>
    </li>
    <li v-if="whatsapp">
      <a
        class="contato-um-toque__acao"
        :href="whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="TEXTOS_GRANDE_DIA.whatsappAria(nome)"
        data-canal="whatsapp"
        data-teste="contato-whatsapp"
      >
        <span
          class="ie ie-whatsapp"
          aria-hidden="true"
        />
        {{ TEXTOS_GRANDE_DIA.whatsapp }}
      </a>
    </li>
  </ul>
</template>

<style scoped>
.contato-um-toque {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.contato-um-toque__acao {
  display: inline-flex;
  gap: var(--p-espaco-2);
  align-items: center;
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: 0 var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  text-decoration: none;
  border: 1px solid var(--p-cor-texto-apoio);
  border-radius: var(--p-raio-total);
}

.contato-um-toque__acao:hover {
  background: var(--p-cor-superficie-sutil);
}
</style>
