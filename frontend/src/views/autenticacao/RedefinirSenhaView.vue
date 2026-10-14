<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_REDEFINIR_SENHA } from '@/textos/autenticacao'
import { focarElemento } from '@/utilitarios/foco'
import { igualA, obrigatorio, senhaForte } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const store = useAutenticacaoStore()
const rota = useRoute()
const roteador = useRouter()

const formulario = useFormulario(
  { novaSenha: '', confirmacao: '' },
  {
    novaSenha: [obrigatorio, senhaForte()],
    confirmacao: [obrigatorio, igualA((): string => formulario.valores.novaSenha)],
  },
)
const token = ref<string | null>(null)
const linkInvalido = ref(false)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)

function lerToken(fragmento: string): string | null {
  const valor = new URLSearchParams(fragmento.replace(/^#/, '')).get('token')
  return valor && valor.trim() !== '' ? valor : null
}

onMounted(() => {
  token.value = lerToken(rota.hash)
  if (rota.hash) {
    window.history.replaceState(window.history.state, '', rota.path)
  }
  linkInvalido.value = token.value === null
  if (!linkInvalido.value) {
    void focarElemento('redefinir-novaSenha')
  }
})

async function enviar() {
  mensagemErro.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(`redefinir-${String(campo)}`)
    }
    return
  }
  if (!token.value) {
    linkInvalido.value = true
    return
  }

  enviando.value = true
  const resultado = await store.redefinirSenha(token.value, formulario.valores.novaSenha)
  enviando.value = false

  if (resultado.ok) {
    token.value = null
    await roteador.replace({ name: 'entrar' })
    return
  }

  if (resultado.tipo === 'linkInvalido') {
    linkInvalido.value = true
    await focarElemento('autenticacao-titulo')
    return
  }

  if (resultado.errosCampos.novaSenha) {
    formulario.erros.novaSenha = resultado.errosCampos.novaSenha
    await focarElemento('redefinir-novaSenha')
    return
  }

  mensagemErro.value = FALHAS[resultado.tipo] ?? MENSAGENS_AUTENTICACAO.inesperado
}

function pedirNovoLink() {
  void roteador.push({ name: 'esqueci-senha' })
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="linkInvalido ? TEXTOS_REDEFINIR_SENHA.linkInvalidoTitulo : TEXTOS_REDEFINIR_SENHA.titulo"
    :descricao="linkInvalido ? undefined : TEXTOS_REDEFINIR_SENHA.descricao"
  >
    <template v-if="linkInvalido">
      <EstadoErro
        :titulo="TEXTOS_REDEFINIR_SENHA.linkInvalidoTitulo"
        :mensagem="TEXTOS_REDEFINIR_SENHA.linkInvalidoTexto"
        :pode-tentar-novamente="false"
      />
      <Button
        type="button"
        :label="TEXTOS_REDEFINIR_SENHA.pedirNovo"
        data-teste="pedir-novo-link"
        @click="pedirNovoLink"
      />
    </template>

    <template v-else>
      <MensagemFormulario
        v-if="mensagemErro"
        :mensagem="mensagemErro"
      />
      <form
        class="formulario-autenticacao"
        novalidate
        data-teste="formulario-redefinir-senha"
        @submit.prevent="enviar"
      >
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.novaSenha"
          id-campo="redefinir-novaSenha"
          :erro="formulario.erros.novaSenha"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.novaSenha"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            com-requisitos
            @blur="formulario.validarCampo('novaSenha')"
          />
        </CampoFormulario>
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.confirmarSenha"
          id-campo="redefinir-confirmacao"
          :erro="formulario.erros.confirmacao"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.confirmacao"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            @blur="formulario.validarCampo('confirmacao')"
          />
        </CampoFormulario>
        <Button
          type="submit"
          :label="TEXTOS_REDEFINIR_SENHA.botao"
          :loading="enviando"
          :aria-busy="enviando"
          data-teste="enviar"
        />
      </form>
    </template>

    <template #rodape>
      <RouterLink
        :to="{ name: 'entrar' }"
        data-teste="link-entrar"
      >
        {{ TEXTOS_REDEFINIR_SENHA.voltar }}
      </RouterLink>
    </template>
  </LayoutAutenticacao>
</template>

<style scoped>
.formulario-autenticacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
}
</style>
