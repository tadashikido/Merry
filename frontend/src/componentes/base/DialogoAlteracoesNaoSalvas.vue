<script setup lang="ts">
import DialogoConfirmacao from './DialogoConfirmacao.vue'
import { useAlteracoesNaoSalvasStore } from '@/stores/alteracoesNaoSalvas'
import { TEXTOS_ALTERACOES_NAO_SALVAS } from '@/textos/mensagens'

const store = useAlteracoesNaoSalvasStore()
</script>

<template>
  <DialogoConfirmacao
    :visivel="store.visivel"
    :titulo="TEXTOS_ALTERACOES_NAO_SALVAS.titulo"
    :mensagem="TEXTOS_ALTERACOES_NAO_SALVAS.mensagem"
    :rotulo-confirmar="TEXTOS_ALTERACOES_NAO_SALVAS.descartar"
    :rotulo-cancelar="TEXTOS_ALTERACOES_NAO_SALVAS.continuar"
    perigoso
    @confirmar="store.descartar()"
    @cancelar="store.continuarEditando()"
  />
</template>
