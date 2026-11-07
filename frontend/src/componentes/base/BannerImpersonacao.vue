<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useImpersonacaoStore } from '@/stores/impersonacao'
import { TEXTOS_IMPERSONACAO } from '@/textos/impersonacao'

const tenant = useAutenticacaoStore()
const impersonacao = useImpersonacaoStore()
const roteador = useRouter()

async function sair() {
  await impersonacao.encerrar()
  await roteador.push({ name: 'operador-assessorias' })
}
</script>

<template>
  <div
    v-if="tenant.impersonando && tenant.assessoriaImpersonada"
    class="banner-impersonacao"
    role="status"
    data-teste="banner-impersonacao"
  >
    <span class="banner-impersonacao__texto">
      {{ TEXTOS_IMPERSONACAO.bannerPrefixo }} <strong>{{ tenant.assessoriaImpersonada.nome }}</strong>
    </span>
    <Button
      :label="TEXTOS_IMPERSONACAO.sair"
      size="small"
      severity="contrast"
      data-teste="impersonacao-sair"
      @click="sair"
    />
  </div>
</template>

<style scoped>
.banner-impersonacao {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem 1rem;
  background: var(--p-cor-destaque, #14244a);
  color: var(--p-cor-destaque-texto, #fff);
  font-size: 0.9375rem;
}

.banner-impersonacao__texto {
  text-align: center;
}
</style>
