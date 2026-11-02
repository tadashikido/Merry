<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useOperadorAutenticacaoStore, type AvisoEntradaOperador, type TipoFalhaOperador } from '@/stores/operadorAutenticacao'
import { MENSAGENS_OPERADOR, TEXTOS_OPERADOR } from '@/textos/operador'
import { focarElemento } from '@/utilitarios/foco'
import { destinoSeguro } from '@/utilitarios/rotaSegura'
import { email, obrigatorio, tamanhoMaximo } from '@/utilitarios/validacao'

interface Mensagem {
  variante: 'erro' | 'sucesso' | 'informacao'
  texto: string
}

const AVISOS: Record<AvisoEntradaOperador, Mensagem> = {
  sessaoTerminou: { variante: 'informacao', texto: MENSAGENS_OPERADOR.sessaoTerminou },
  saiu: { variante: 'informacao', texto: MENSAGENS_OPERADOR.saiu },
}

const FALHAS: Partial<Record<TipoFalhaOperador, string>> = {
  credenciais: MENSAGENS_OPERADOR.credenciais,
  limite: MENSAGENS_OPERADOR.muitasTentativas,
  conexao: MENSAGENS_OPERADOR.conexao,
}

const store = useOperadorAutenticacaoStore()
const rota = useRoute()
const roteador = useRouter()

const formulario = useFormulario(
  { email: '', senha: '' },
  { email: [obrigatorio, email, tamanhoMaximo(254)], senha: [obrigatorio, tamanhoMaximo(512)] },
)
const enviando = ref(false)
const mensagem = ref<Mensagem | null>(null)

onMounted(() => {
  const aviso = store.consumirAviso()
  mensagem.value = aviso ? AVISOS[aviso] : null
  void focarElemento('operador-email')
})

async function enviar() {
  mensagem.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(`operador-${String(campo)}`)
    }
    return
  }

  enviando.value = true
  const resultado = await store.entrar({ email: formulario.valores.email.trim(), senha: formulario.valores.senha })
  enviando.value = false

  if (resultado.ok) {
    await roteador.replace(destinoSeguro(rota.query.destino) ?? { name: 'operador-area' })
    return
  }

  formulario.valores.senha = ''
  mensagem.value = { variante: 'erro', texto: FALHAS[resultado.tipo] ?? MENSAGENS_OPERADOR.inesperado }
  await focarElemento('operador-senha')
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="TEXTOS_OPERADOR.loginTitulo"
    :descricao="TEXTOS_OPERADOR.loginDescricao"
  >
    <MensagemFormulario
      v-if="mensagem"
      :variante="mensagem.variante"
      :mensagem="mensagem.texto"
    />
    <form
      class="pilha pilha--cartao"
      novalidate
      data-teste="formulario-operador-entrar"
      @submit.prevent="enviar"
    >
      <div class="pilha pilha--grupo">
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="TEXTOS_OPERADOR.rotuloEmail"
          id-campo="operador-email"
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
            :placeholder="TEXTOS_OPERADOR.exemploEmail"
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
          :rotulo="TEXTOS_OPERADOR.rotuloSenha"
          id-campo="operador-senha"
          :erro="formulario.erros.senha"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.senha"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="current-password"
            @update:model-value="formulario.revalidarAoDigitar('senha')"
            @blur="formulario.validarAoSair('senha')"
          />
        </CampoFormulario>
      </div>

      <Button
        type="submit"
        :label="TEXTOS_OPERADOR.botaoEntrar"
        :loading="enviando"
        :aria-busy="enviando"
        data-teste="operador-enviar"
      />
    </form>
  </LayoutAutenticacao>
</template>
