<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_CADASTRO } from '@/textos/autenticacao'
import { focarElemento } from '@/utilitarios/foco'
import { email, obrigatorio, senhaForte, tamanhoMaximo, tamanhoMinimo } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
  conflito: TEXTOS_CADASTRO.emailEmUso,
}

const CAMPOS = ['nomeAssessoria', 'nome', 'email', 'senha'] as const
type Campo = (typeof CAMPOS)[number]

const store = useAutenticacaoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const formulario = useFormulario(
  { nomeAssessoria: '', nome: '', email: '', senha: '' },
  {
    nomeAssessoria: [obrigatorio, tamanhoMinimo(2), tamanhoMaximo(120)],
    nome: [obrigatorio, tamanhoMinimo(2), tamanhoMaximo(120)],
    email: [obrigatorio, email, tamanhoMaximo(254)],
    senha: [obrigatorio, senhaForte((): string => formulario.valores.email)],
  },
)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const emailEmUso = ref(false)

const idCampo = (campo: Campo) => `cadastro-${campo}`

onMounted(() => {
  void focarElemento(idCampo('nomeAssessoria'))
})

async function enviar() {
  mensagemErro.value = null
  emailEmUso.value = false
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(idCampo(campo))
    }
    return
  }

  enviando.value = true
  const nomeAssessoria = formulario.valores.nomeAssessoria.trim()
  const resultado = await store.cadastrar({
    nomeAssessoria,
    nome: formulario.valores.nome.trim(),
    email: formulario.valores.email.trim(),
    senha: formulario.valores.senha,
  })
  enviando.value = false

  if (resultado.ok) {
    notificacao.sucesso(MENSAGENS_AUTENTICACAO.contaCriada(nomeAssessoria))
    await roteador.replace({ name: 'inicio' })
    return
  }

  if (resultado.tipo === 'conflito') {
    emailEmUso.value = true
    formulario.erros.email = TEXTOS_CADASTRO.emailEmUso
    store.emailInformado = formulario.valores.email.trim()
    await focarElemento(idCampo('email'))
    return
  }

  const camposComErro = CAMPOS.filter((campo) => resultado.errosCampos[campo])
  for (const campo of camposComErro) {
    formulario.erros[campo] = resultado.errosCampos[campo]
  }
  const primeiro = camposComErro[0]
  if (primeiro) {
    await focarElemento(idCampo(primeiro))
    return
  }

  mensagemErro.value = FALHAS[resultado.tipo] ?? MENSAGENS_AUTENTICACAO.inesperado
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="TEXTOS_CADASTRO.titulo"
    :descricao="TEXTOS_CADASTRO.descricao"
  >
    <MensagemFormulario
      v-if="mensagemErro"
      :mensagem="mensagemErro"
    />
    <MensagemFormulario
      v-if="emailEmUso"
      :mensagem="TEXTOS_CADASTRO.emailEmUso"
      data-teste="aviso-email-em-uso"
    >
      <RouterLink :to="{ name: 'entrar' }">
        {{ TEXTOS_CADASTRO.entrar }}
      </RouterLink>
      <RouterLink :to="{ name: 'esqueci-senha' }">
        {{ TEXTOS_CADASTRO.recuperarSenha }}
      </RouterLink>
    </MensagemFormulario>

    <form
      class="formulario-cadastro pilha pilha--bloco"
      novalidate
      data-teste="formulario-cadastro"
      @submit.prevent="enviar"
    >
      <fieldset class="formulario-cadastro__grupo pilha pilha--grupo">
        <legend class="formulario-cadastro__legenda texto-rotulo">
          {{ TEXTOS_CADASTRO.grupoAssessoria }}
        </legend>
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.nomeAssessoria"
          :id-campo="idCampo('nomeAssessoria')"
          :dica="ROTULOS_CAMPOS_AUTENTICACAO.nomeAssessoriaDica"
          :erro="formulario.erros.nomeAssessoria"
        >
          <InputText
            :id="id"
            v-model="formulario.valores.nomeAssessoria"
            autocomplete="organization"
            maxlength="120"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="enviando"
            @update:model-value="formulario.revalidarAoDigitar('nomeAssessoria')"
            @blur="formulario.validarAoSair('nomeAssessoria')"
          />
        </CampoFormulario>
      </fieldset>

      <fieldset class="formulario-cadastro__grupo pilha pilha--grupo">
        <legend class="formulario-cadastro__legenda texto-rotulo">
          {{ TEXTOS_CADASTRO.grupoAcesso }}
        </legend>
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.nome"
          :id-campo="idCampo('nome')"
          :erro="formulario.erros.nome"
        >
          <InputText
            :id="id"
            v-model="formulario.valores.nome"
            autocomplete="name"
            maxlength="120"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="enviando"
            @update:model-value="formulario.revalidarAoDigitar('nome')"
            @blur="formulario.validarAoSair('nome')"
          />
        </CampoFormulario>

        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.email"
          :id-campo="idCampo('email')"
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
            maxlength="254"
            :placeholder="ROTULOS_CAMPOS_AUTENTICACAO.exemploEmail"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="enviando"
            @update:model-value="formulario.revalidarAoDigitar('email')"
            @blur="formulario.validarAoSair('email')"
          />
        </CampoFormulario>

        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.senha"
          :id-campo="idCampo('senha')"
          :erro="formulario.erros.senha"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.senha"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            com-requisitos
            @update:model-value="formulario.revalidarAoDigitar('senha')"
            @blur="formulario.validarAoSair('senha')"
          />
        </CampoFormulario>
      </fieldset>

      <div class="pilha pilha--campo">
        <Button
          type="submit"
          :label="TEXTOS_CADASTRO.botao"
          :loading="enviando"
          :aria-busy="enviando"
          data-teste="enviar"
        />
        <p class="formulario-cadastro__apoio texto-legenda">
          {{ TEXTOS_CADASTRO.apoio }}
        </p>
      </div>
    </form>

    <template #rodape>
      {{ TEXTOS_CADASTRO.jaTemConta }}
      <RouterLink
        :to="{ name: 'entrar' }"
        data-teste="link-entrar"
      >
        {{ TEXTOS_CADASTRO.entrar }}
      </RouterLink>
    </template>
  </LayoutAutenticacao>
</template>

<style scoped>
.formulario-cadastro__grupo {
  padding: 0;
  margin: 0;
  border: 0;
}

.formulario-cadastro__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-cadastro__apoio {
  text-align: center;
}
</style>
