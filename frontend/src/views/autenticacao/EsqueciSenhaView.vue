<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_ESQUECI_SENHA } from '@/textos/autenticacao'
import { focarElemento } from '@/utilitarios/foco'
import { email, obrigatorio, tamanhoMaximo } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const store = useAutenticacaoStore()
const formulario = useFormulario({ email: store.emailInformado }, { email: [obrigatorio, email, tamanhoMaximo(254)] })
const enviando = ref(false)
const enviado = ref(false)
const mensagemErro = ref<string | null>(null)

onMounted(() => {
  void focarElemento('esqueci-email')
})

async function enviar() {
  mensagemErro.value = null
  if (!formulario.validar()) {
    await focarElemento('esqueci-email')
    return
  }

  enviando.value = true
  const emailInformado = formulario.valores.email.trim()
  store.emailInformado = emailInformado
  const resultado = await store.solicitarRecuperacao(emailInformado)
  enviando.value = false

  if (resultado.ok) {
    enviado.value = true
    await focarElemento('autenticacao-titulo')
    return
  }

  if (resultado.errosCampos.email) {
    formulario.erros.email = resultado.errosCampos.email
    await focarElemento('esqueci-email')
    return
  }

  mensagemErro.value = FALHAS[resultado.tipo] ?? MENSAGENS_AUTENTICACAO.inesperado
}

async function enviarDeNovo() {
  enviado.value = false
  await focarElemento('esqueci-email')
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="enviado ? TEXTOS_ESQUECI_SENHA.enviadoTitulo : TEXTOS_ESQUECI_SENHA.titulo"
    :descricao="enviado ? TEXTOS_ESQUECI_SENHA.enviadoTexto : TEXTOS_ESQUECI_SENHA.descricao"
  >
    <div
      v-if="enviado"
      class="confirmacao-envio pilha pilha--grupo"
      data-teste="confirmacao-envio"
    >
      <span
        class="confirmacao-envio__lacre"
        aria-hidden="true"
        data-teste="lacre-envio"
      >
        <span class="ie ie-email" />
      </span>
      <p class="confirmacao-envio__dica texto-legenda">
        {{ TEXTOS_ESQUECI_SENHA.enviadoDica }}
      </p>
      <Button
        type="button"
        :label="TEXTOS_ESQUECI_SENHA.enviarDeNovo"
        link
        data-teste="enviar-de-novo"
        @click="enviarDeNovo"
      />
    </div>

    <template v-else>
      <MensagemFormulario
        v-if="mensagemErro"
        :mensagem="mensagemErro"
      />
      <form
        class="formulario-esqueci pilha pilha--cartao"
        novalidate
        data-teste="formulario-esqueci-senha"
        @submit.prevent="enviar"
      >
        <div class="pilha pilha--grupo">
          <CampoFormulario
            v-slot="{ id, invalido, descritoPor }"
            :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.email"
            id-campo="esqueci-email"
            :erro="formulario.erros.email"
          >
            <InputText
              :id="id"
              v-model="formulario.valores.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="ROTULOS_CAMPOS_AUTENTICACAO.exemploEmail"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              @update:model-value="formulario.revalidarAoDigitar('email')"
              @blur="formulario.validarAoSair('email')"
            />
          </CampoFormulario>
        </div>

        <Button
          type="submit"
          :label="TEXTOS_ESQUECI_SENHA.botao"
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
        {{ TEXTOS_ESQUECI_SENHA.voltar }}
      </RouterLink>
    </template>
  </LayoutAutenticacao>
</template>

<style scoped>
.confirmacao-envio {
  align-items: center;
  text-align: center;
}

.confirmacao-envio__lacre {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-alvo-presenca);
  height: var(--p-dimensao-alvo-presenca);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  color: var(--p-cor-acento-texto);
  background: var(--p-cor-acento-suave);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-total);
}

.confirmacao-envio__dica {
  max-width: 32ch;
  text-wrap: pretty;
}
</style>
