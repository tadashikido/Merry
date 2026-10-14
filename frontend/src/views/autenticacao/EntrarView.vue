<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useAutenticacaoStore, type AvisoEntrada, type TipoFalha } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_ENTRAR } from '@/textos/autenticacao'
import { focarElemento } from '@/utilitarios/foco'
import { destinoSeguro } from '@/utilitarios/rotaSegura'
import { email, obrigatorio, tamanhoMaximo } from '@/utilitarios/validacao'

interface Mensagem {
  variante: 'erro' | 'sucesso' | 'informacao'
  texto: string
}

const AVISOS: Record<AvisoEntrada, Mensagem> = {
  sessaoTerminou: { variante: 'informacao', texto: MENSAGENS_AUTENTICACAO.sessaoTerminou },
  saiu: { variante: 'informacao', texto: MENSAGENS_AUTENTICACAO.saiu },
  senhaRedefinida: { variante: 'sucesso', texto: MENSAGENS_AUTENTICACAO.senhaRedefinida },
}

const FALHAS: Partial<Record<TipoFalha, string>> = {
  credenciais: MENSAGENS_AUTENTICACAO.credenciais,
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const store = useAutenticacaoStore()
const rota = useRoute()
const roteador = useRouter()

const formulario = useFormulario(
  { email: store.emailInformado, senha: '' },
  { email: [obrigatorio, email, tamanhoMaximo(254)], senha: [obrigatorio, tamanhoMaximo(512)] },
)
const enviando = ref(false)
const mensagem = ref<Mensagem | null>(null)

onMounted(() => {
  const aviso = store.consumirAviso()
  mensagem.value = aviso ? AVISOS[aviso] : null
  void focarElemento(formulario.valores.email ? 'entrar-senha' : 'entrar-email')
})

async function enviar() {
  mensagem.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(`entrar-${String(campo)}`)
    }
    return
  }

  enviando.value = true
  store.emailInformado = formulario.valores.email.trim()
  const resultado = await store.entrar({ email: formulario.valores.email.trim(), senha: formulario.valores.senha })
  enviando.value = false

  if (resultado.ok) {
    await roteador.replace(destinoSeguro(rota.query.destino) ?? { name: 'inicio' })
    return
  }

  formulario.valores.senha = ''
  mensagem.value = { variante: 'erro', texto: FALHAS[resultado.tipo] ?? MENSAGENS_AUTENTICACAO.inesperado }
  await focarElemento('entrar-senha')
}

function lembrarEmail() {
  store.emailInformado = formulario.valores.email.trim()
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="TEXTOS_ENTRAR.titulo"
    :descricao="TEXTOS_ENTRAR.descricao"
  >
    <MensagemFormulario
      v-if="mensagem"
      :variante="mensagem.variante"
      :mensagem="mensagem.texto"
    />
    <form
      class="formulario-entrar pilha pilha--cartao"
      novalidate
      data-teste="formulario-entrar"
      @submit.prevent="enviar"
    >
      <div class="pilha pilha--grupo">
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.email"
          id-campo="entrar-email"
          :erro="formulario.erros.email"
        >
          <InputText
            :id="id"
            v-model="formulario.valores.email"
            type="email"
            inputmode="email"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="ROTULOS_CAMPOS_AUTENTICACAO.exemploEmail"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="enviando"
            @blur="formulario.validarAoSair('email')"
          />
        </CampoFormulario>

        <CampoFormulario
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.senha"
          id-campo="entrar-senha"
          :erro="formulario.erros.senha"
        >
          <template #acao-rotulo>
            <RouterLink
              class="formulario-entrar__esqueci"
              :to="{ name: 'esqueci-senha' }"
              data-teste="link-esqueci-senha"
              @click="lembrarEmail"
            >
              {{ TEXTOS_ENTRAR.esqueci }}
            </RouterLink>
          </template>
          <template #default="{ id, invalido, descritoPor }">
            <CampoSenha
              :id="id"
              v-model="formulario.valores.senha"
              :invalido="invalido"
              :descrito-por="descritoPor"
              autocomplete="current-password"
            />
          </template>
        </CampoFormulario>
      </div>

      <Button
        type="submit"
        :label="TEXTOS_ENTRAR.botao"
        :loading="enviando"
        :aria-busy="enviando"
        data-teste="enviar"
      />
    </form>

    <template #rodape>
      {{ TEXTOS_ENTRAR.semConta }}
      <RouterLink
        :to="{ name: 'cadastro' }"
        data-teste="link-cadastro"
      >
        {{ TEXTOS_ENTRAR.criarConta }}
      </RouterLink>
    </template>
  </LayoutAutenticacao>
</template>

<style scoped>
.formulario-entrar__esqueci {
  font-size: var(--p-fonte-tamanho-controle);
}

@media (pointer: coarse) {
  .formulario-entrar__esqueci {
    display: inline-flex;
    align-items: center;
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
