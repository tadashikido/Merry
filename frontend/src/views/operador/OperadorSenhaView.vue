<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useOperadorAutenticacaoStore } from '@/stores/operadorAutenticacao'
import { MENSAGENS_OPERADOR, TEXTOS_OPERADOR } from '@/textos/operador'
import { focarElemento } from '@/utilitarios/foco'
import { obrigatorio, tamanhoMaximo } from '@/utilitarios/validacao'

interface Mensagem {
  variante: 'erro' | 'sucesso'
  texto: string
}

const store = useOperadorAutenticacaoStore()
const roteador = useRouter()

const formulario = useFormulario(
  { senhaAtual: '', novaSenha: '' },
  { senhaAtual: [obrigatorio, tamanhoMaximo(512)], novaSenha: [obrigatorio, tamanhoMaximo(512)] },
)
const enviando = ref(false)
const mensagem = ref<Mensagem | null>(null)

onMounted(() => {
  void focarElemento('operador-senhaAtual')
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
  const resultado = await store.alterarSenha({
    senhaAtual: formulario.valores.senhaAtual,
    novaSenha: formulario.valores.novaSenha,
  })
  enviando.value = false

  if (resultado.ok) {
    formulario.valores.senhaAtual = ''
    formulario.valores.novaSenha = ''
    mensagem.value = { variante: 'sucesso', texto: MENSAGENS_OPERADOR.senhaAlterada }
    return
  }

  mensagem.value = { variante: 'erro', texto: resultado.mensagem }
  await focarElemento('operador-novaSenha')
}
</script>

<template>
  <main class="operador-senha">
    <header class="operador-senha__topo">
      <div>
        <p class="operador-senha__rotulo">
          {{ TEXTOS_OPERADOR.areaTitulo }}
        </p>
        <h1 class="operador-senha__titulo">
          {{ TEXTOS_OPERADOR.senhaTitulo }}
        </h1>
        <p class="operador-senha__descricao">
          {{ TEXTOS_OPERADOR.senhaDescricao }}
        </p>
      </div>
      <Button
        :label="TEXTOS_OPERADOR.voltarArea"
        severity="secondary"
        data-teste="operador-voltar"
        @click="roteador.push({ name: 'operador-area' })"
      />
    </header>

    <MensagemFormulario
      v-if="mensagem"
      :variante="mensagem.variante"
      :mensagem="mensagem.texto"
    />

    <form
      class="pilha pilha--cartao operador-senha__form"
      novalidate
      data-teste="formulario-operador-senha"
      @submit.prevent="enviar"
    >
      <div class="pilha pilha--grupo">
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="TEXTOS_OPERADOR.rotuloSenhaAtual"
          id-campo="operador-senhaAtual"
          :erro="formulario.erros.senhaAtual"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.senhaAtual"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="current-password"
            @update:model-value="formulario.revalidarAoDigitar('senhaAtual')"
            @blur="formulario.validarAoSair('senhaAtual')"
          />
        </CampoFormulario>

        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="TEXTOS_OPERADOR.rotuloNovaSenha"
          id-campo="operador-novaSenha"
          :erro="formulario.erros.novaSenha"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.novaSenha"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            @update:model-value="formulario.revalidarAoDigitar('novaSenha')"
            @blur="formulario.validarAoSair('novaSenha')"
          />
        </CampoFormulario>
      </div>

      <Button
        type="submit"
        :label="TEXTOS_OPERADOR.botaoSalvarSenha"
        :loading="enviando"
        :aria-busy="enviando"
        data-teste="operador-salvar-senha"
      />
    </form>
  </main>
</template>

<style scoped>
.operador-senha {
  max-width: 32rem;
  margin-inline: auto;
  padding: 1.5rem;
}

.operador-senha__topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.operador-senha__rotulo {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.875rem;
}

.operador-senha__titulo {
  margin: 0.25rem 0 0;
}

.operador-senha__descricao {
  margin: 0.5rem 0 0;
  color: var(--p-text-muted-color, #64748b);
}

.operador-senha__form {
  margin-top: 1rem;
}
</style>
