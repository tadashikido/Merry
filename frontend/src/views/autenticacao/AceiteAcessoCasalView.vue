<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import IndicadorAbertura from '@/componentes/base/IndicadorAbertura.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { TEXTOS_ACEITE_CASAL } from '@/textos/acessoCasal'
import { MENSAGENS_AUTENTICACAO } from '@/textos/autenticacao'
import type { ConviteAcessoCasalDto } from '@/tipos/acessoCasal'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesCasal } from '@/utilitarios/formatacao'
import { igualA, obrigatorio, senhaForte } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const store = useAutenticacaoStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()

const token = ref<string | null>(null)
const convite = ref<ConviteAcessoCasalDto | null>(null)
const carregando = ref(true)
const invalido = ref(false)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const tinhaSessao = ref(false)

const formulario = useFormulario(
  { senha: '', confirmacao: '' },
  {
    senha: [obrigatorio, senhaForte((): string => convite.value?.email ?? '')],
    confirmacao: [obrigatorio, igualA((): string => formulario.valores.senha, TEXTOS_ACEITE_CASAL.senhasDiferentes)],
  },
)

const nomes = computed(() =>
  convite.value ? formatarNomesCasal(convite.value.nomePrimeiraPessoa, convite.value.nomeSegundaPessoa) : '',
)

const titulo = computed(() => {
  if (invalido.value) {
    return TEXTOS_ACEITE_CASAL.invalidoTitulo
  }
  return nomes.value ? TEXTOS_ACEITE_CASAL.titulo(nomes.value) : TEXTOS_ACEITE_CASAL.tituloPadrao
})

const descricao = computed(() =>
  convite.value && !invalido.value ? TEXTOS_ACEITE_CASAL.descricao(convite.value.organizacao) : undefined,
)

function lerToken(fragmento: string): string | null {
  const valor = new URLSearchParams(fragmento.replace(/^#/, '')).get('token')
  return valor && valor.trim() !== '' ? valor : null
}

async function consultar() {
  if (!token.value) {
    invalido.value = true
    carregando.value = false
    return
  }

  carregando.value = true
  mensagemErro.value = null
  const resultado = await store.consultarConviteCasal(token.value)
  carregando.value = false

  if (resultado.ok) {
    convite.value = resultado.convite
    await focarElemento('aceite-senha')
    return
  }

  if (resultado.tipo === 'linkInvalido' || resultado.tipo === 'validacao') {
    invalido.value = true
    await focarElemento('autenticacao-titulo')
    return
  }

  mensagemErro.value = FALHAS[resultado.tipo] ?? MENSAGENS_AUTENTICACAO.inesperado
}

onMounted(() => {
  token.value = lerToken(rota.hash)
  tinhaSessao.value = store.autenticado
  if (rota.hash) {
    window.history.replaceState(window.history.state, '', rota.path)
  }
  void consultar()
})

async function enviar() {
  mensagemErro.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(`aceite-${String(campo)}`)
    }
    return
  }
  if (!token.value) {
    invalido.value = true
    return
  }

  enviando.value = true
  const resultado = await store.aceitarConviteCasal(token.value, formulario.valores.senha)
  enviando.value = false

  if (resultado.ok) {
    token.value = null
    const primeiroNome = store.usuario?.nome.split(' ')[0] ?? ''
    notificacao.sucesso(TEXTOS_ACEITE_CASAL.boasVindas(primeiroNome))
    const casamentoId = store.casamentoDoCasal
    await roteador.replace(casamentoId ? { name: 'casamento', params: { id: casamentoId } } : { name: 'inicio' })
    return
  }

  if (resultado.tipo === 'linkInvalido') {
    invalido.value = true
    await focarElemento('autenticacao-titulo')
    return
  }

  if (resultado.errosCampos.senha) {
    formulario.erros.senha = resultado.errosCampos.senha
    await focarElemento('aceite-senha')
    return
  }

  mensagemErro.value = FALHAS[resultado.tipo] ?? MENSAGENS_AUTENTICACAO.inesperado
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="titulo"
    :descricao="descricao"
  >
    <IndicadorAbertura
      v-if="carregando"
      :texto="TEXTOS_ACEITE_CASAL.abrindo"
    />

    <template v-else-if="invalido">
      <EstadoErro
        :titulo="TEXTOS_ACEITE_CASAL.invalidoTitulo"
        :mensagem="TEXTOS_ACEITE_CASAL.invalidoTexto"
        :pode-tentar-novamente="false"
        data-teste="convite-invalido"
      />
    </template>

    <template v-else-if="convite">
      <MensagemFormulario
        v-if="mensagemErro"
        :mensagem="mensagemErro"
      />
      <MensagemFormulario
        v-if="tinhaSessao"
        variante="informacao"
        :mensagem="TEXTOS_ACEITE_CASAL.outraConta"
        data-teste="aviso-outra-conta"
      />
      <form
        class="formulario-autenticacao"
        novalidate
        data-teste="formulario-aceite-casal"
        @submit.prevent="enviar"
      >
        <dl class="aceite__email">
          <dt>{{ TEXTOS_ACEITE_CASAL.email }}</dt>
          <dd data-teste="email-convite">
            {{ convite.email }}
          </dd>
        </dl>
        <CampoFormulario
          v-slot="{ id, invalido: campoInvalido, descritoPor }"
          :rotulo="TEXTOS_ACEITE_CASAL.senha"
          id-campo="aceite-senha"
          :erro="formulario.erros.senha"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.senha"
            :invalido="campoInvalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            com-requisitos
            @blur="formulario.validarCampo('senha')"
          />
        </CampoFormulario>
        <CampoFormulario
          v-slot="{ id, invalido: campoInvalido, descritoPor }"
          :rotulo="TEXTOS_ACEITE_CASAL.confirmarSenha"
          id-campo="aceite-confirmacao"
          :erro="formulario.erros.confirmacao"
        >
          <CampoSenha
            :id="id"
            v-model="formulario.valores.confirmacao"
            :invalido="campoInvalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            @blur="formulario.validarCampo('confirmacao')"
          />
        </CampoFormulario>
        <Button
          type="submit"
          :label="TEXTOS_ACEITE_CASAL.enviar"
          :loading="enviando"
          :aria-busy="enviando"
          data-teste="aceitar-convite"
        />
      </form>
    </template>

    <MensagemFormulario
      v-else-if="mensagemErro"
      :mensagem="mensagemErro"
    />

    <template #rodape>
      <p
        v-if="convite && !invalido"
        class="aceite__apoio"
      >
        {{ TEXTOS_ACEITE_CASAL.naoEsperava }}
      </p>
      <p v-else>
        {{ TEXTOS_ACEITE_CASAL.jaTemConta }}
        <RouterLink
          :to="{ name: 'entrar' }"
          data-teste="link-entrar"
        >
          {{ TEXTOS_ACEITE_CASAL.entrar }}
        </RouterLink>
      </p>
    </template>
  </LayoutAutenticacao>
</template>

<style scoped>
.formulario-autenticacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
}

.aceite__email {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: 0;
}

.aceite__email dt {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-apoio);
}

.aceite__email dd {
  margin: 0;
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.aceite__apoio {
  margin: 0;
}
</style>
