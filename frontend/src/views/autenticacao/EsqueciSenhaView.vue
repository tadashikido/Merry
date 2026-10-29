<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import OrientacaoAcesso, { type ItemOrientacaoAcesso } from '@/componentes/base/OrientacaoAcesso.vue'
import TileTipo from '@/componentes/base/TileTipo.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_ESQUECI_SENHA } from '@/textos/autenticacao'
import { focarElemento } from '@/utilitarios/foco'
import { email, obrigatorio, tamanhoMaximo } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const ID_ANTES = 'esqueci-antes'
const ID_ENQUANTO = 'esqueci-enquanto'

const ORIENTACAO_ANTES: readonly ItemOrientacaoAcesso[] = [
  {
    chave: 'email-conta',
    titulo: TEXTOS_ESQUECI_SENHA.emailContaTitulo,
    texto: TEXTOS_ESQUECI_SENHA.emailContaTexto,
    teste: 'orientacao-email-conta',
  },
  {
    chave: 'sem-senha',
    titulo: TEXTOS_ESQUECI_SENHA.semSenhaTitulo,
    texto: TEXTOS_ESQUECI_SENHA.semSenhaTexto,
    teste: 'orientacao-sem-senha',
  },
]

const ORIENTACAO_ENQUANTO: readonly ItemOrientacaoAcesso[] = [
  {
    chave: 'assunto',
    titulo: TEXTOS_ESQUECI_SENHA.assuntoTitulo,
    texto: TEXTOS_ESQUECI_SENHA.assuntoTexto,
    teste: 'orientacao-assunto',
  },
  {
    chave: 'mais-de-um-pedido',
    titulo: TEXTOS_ESQUECI_SENHA.maisDeUmPedidoTitulo,
    texto: TEXTOS_ESQUECI_SENHA.maisDeUmPedidoTexto,
    teste: 'orientacao-mais-de-um-pedido',
  },
  {
    chave: 'depois',
    titulo: TEXTOS_ESQUECI_SENHA.depoisTitulo,
    texto: TEXTOS_ESQUECI_SENHA.depoisTexto,
    teste: 'orientacao-depois',
  },
]

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
      <TileTipo
        tom="champanhe"
        icone="email"
        tamanho="grande"
        data-teste="lacre-envio"
      />
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

    <template #complemento>
      <OrientacaoAcesso
        v-if="enviado"
        :id-titulo="ID_ENQUANTO"
        :titulo="TEXTOS_ESQUECI_SENHA.enquantoTitulo"
        :itens="ORIENTACAO_ENQUANTO"
        data-teste="orientacao-enquanto"
      >
        <p data-teste="nota-anfitriao">
          <strong>{{ TEXTOS_ESQUECI_SENHA.anfitriaoNotaTitulo }}</strong>
          {{ TEXTOS_ESQUECI_SENHA.anfitriaoNotaTexto }}
        </p>
      </OrientacaoAcesso>
      <OrientacaoAcesso
        v-else
        :id-titulo="ID_ANTES"
        :titulo="TEXTOS_ESQUECI_SENHA.antesTitulo"
        :itens="ORIENTACAO_ANTES"
        data-teste="orientacao-antes"
      />
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

.confirmacao-envio__dica {
  max-width: 32ch;
  text-wrap: pretty;
}
</style>
