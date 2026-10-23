<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import LacreIcone from '@/componentes/base/LacreIcone.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import OrientacaoAcesso, { type ItemOrientacaoAcesso } from '@/componentes/base/OrientacaoAcesso.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_REDEFINIR_SENHA } from '@/textos/autenticacao'
import { focarElemento } from '@/utilitarios/foco'
import { igualA, obrigatorio, senhaForte } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const ID_NOVA_SENHA = 'redefinir-nova-senha'
const ID_LINK_INVALIDO = 'redefinir-link-invalido'

const ORIENTACAO_NOVA_SENHA: readonly ItemOrientacaoAcesso[] = [
  {
    chave: 'so-sua',
    titulo: TEXTOS_REDEFINIR_SENHA.soSuaTitulo,
    texto: TEXTOS_REDEFINIR_SENHA.soSuaTexto,
    teste: 'orientacao-so-sua',
  },
  {
    chave: 'depois',
    titulo: TEXTOS_REDEFINIR_SENHA.depoisTitulo,
    texto: TEXTOS_REDEFINIR_SENHA.depoisTexto,
    teste: 'orientacao-depois',
  },
  {
    chave: 'aparelhos',
    titulo: TEXTOS_REDEFINIR_SENHA.aparelhosTitulo,
    texto: TEXTOS_REDEFINIR_SENHA.aparelhosTexto,
    teste: 'orientacao-aparelhos',
  },
]

const ORIENTACAO_LINK_INVALIDO: readonly ItemOrientacaoAcesso[] = [
  {
    chave: 'validade',
    titulo: TEXTOS_REDEFINIR_SENHA.validadeTitulo,
    texto: TEXTOS_REDEFINIR_SENHA.validadeTexto,
    teste: 'orientacao-validade',
  },
  {
    chave: 'uso-unico',
    titulo: TEXTOS_REDEFINIR_SENHA.usoUnicoTitulo,
    texto: TEXTOS_REDEFINIR_SENHA.usoUnicoTexto,
    teste: 'orientacao-uso-unico',
  },
  {
    chave: 'mais-de-um-pedido',
    titulo: TEXTOS_REDEFINIR_SENHA.maisDeUmPedidoTitulo,
    texto: TEXTOS_REDEFINIR_SENHA.maisDeUmPedidoTexto,
    teste: 'orientacao-mais-de-um-pedido',
  },
]

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

function aoDigitarNovaSenha() {
  formulario.revalidarAoDigitar('novaSenha')
  formulario.revalidarAoDigitar('confirmacao')
}

function pedirNovoLink() {
  void roteador.push({ name: 'esqueci-senha' })
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="linkInvalido ? TEXTOS_REDEFINIR_SENHA.linkInvalidoTitulo : TEXTOS_REDEFINIR_SENHA.titulo"
    :descricao="linkInvalido ? TEXTOS_REDEFINIR_SENHA.linkInvalidoTexto : TEXTOS_REDEFINIR_SENHA.descricao"
  >
    <div
      v-if="linkInvalido"
      class="link-invalido pilha pilha--cartao"
      data-teste="link-invalido"
    >
      <LacreIcone
        class="link-invalido__lacre"
        icone="ie-link"
        data-teste="lacre-link-invalido"
      />
      <Button
        type="button"
        :label="TEXTOS_REDEFINIR_SENHA.pedirNovo"
        data-teste="pedir-novo-link"
        @click="pedirNovoLink"
      />
    </div>

    <template v-else>
      <MensagemFormulario
        v-if="mensagemErro"
        :mensagem="mensagemErro"
      />
      <form
        class="pilha pilha--cartao"
        novalidate
        data-teste="formulario-redefinir-senha"
        @submit.prevent="enviar"
      >
        <div class="pilha pilha--grupo">
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
              @update:model-value="aoDigitarNovaSenha"
              @blur="formulario.validarAoSair('novaSenha')"
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
              @update:model-value="formulario.revalidarAoDigitar('confirmacao')"
              @blur="formulario.validarAoSair('confirmacao')"
            />
          </CampoFormulario>
        </div>

        <Button
          type="submit"
          :label="TEXTOS_REDEFINIR_SENHA.botao"
          :loading="enviando"
          :aria-busy="enviando"
          data-teste="enviar"
        />
      </form>
    </template>

    <template #complemento>
      <OrientacaoAcesso
        v-if="linkInvalido"
        :id-titulo="ID_LINK_INVALIDO"
        :titulo="TEXTOS_REDEFINIR_SENHA.motivoTitulo"
        :itens="ORIENTACAO_LINK_INVALIDO"
        data-teste="orientacao-link-invalido"
      >
        <p data-teste="nota-anfitriao">
          <strong>{{ TEXTOS_REDEFINIR_SENHA.anfitriaoNotaTitulo }}</strong>
          {{ TEXTOS_REDEFINIR_SENHA.anfitriaoNotaTexto }}
        </p>
      </OrientacaoAcesso>
      <OrientacaoAcesso
        v-else
        :id-titulo="ID_NOVA_SENHA"
        :titulo="TEXTOS_REDEFINIR_SENHA.sobreTitulo"
        :itens="ORIENTACAO_NOVA_SENHA"
        data-teste="orientacao-nova-senha"
      />
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
.link-invalido__lacre {
  align-self: center;
}
</style>
