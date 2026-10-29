<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import EtiquetaTipo from '@/componentes/base/EtiquetaTipo.vue'
import IndicadorAbertura from '@/componentes/base/IndicadorAbertura.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import OrientacaoAcesso, { type ItemOrientacaoAcesso } from '@/componentes/base/OrientacaoAcesso.vue'
import TileTipo from '@/componentes/base/TileTipo.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore, type TipoFalha } from '@/stores/autenticacao'
import { TEXTOS_ACEITE_ANFITRIAO, TRATAMENTO_ACEITE_ANFITRIAO, tratamentoDoConvite } from '@/textos/acessoAnfitriao'
import { MENSAGENS_AUTENTICACAO } from '@/textos/autenticacao'
import { vocabularioDoTipo } from '@/textos/tiposEvento'
import type { ConviteAcessoAnfitriaoDto } from '@/tipos/acessoAnfitriao'
import { focarElemento } from '@/utilitarios/foco'
import { formatarData, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { igualA, obrigatorio, senhaForte } from '@/utilitarios/validacao'

const FALHAS: Partial<Record<TipoFalha, string>> = {
  limite: MENSAGENS_AUTENTICACAO.muitasTentativas,
  conexao: MENSAGENS_AUTENTICACAO.conexao,
}

const ID_ORIENTACAO_CONVITE = 'aceite-o-que-acompanhar'
const ID_CONVITE_INVALIDO = 'aceite-convite-invalido'

const ORIENTACAO_CONVITE_INVALIDO: readonly ItemOrientacaoAcesso[] = [
  {
    chave: 'prazo',
    titulo: TEXTOS_ACEITE_ANFITRIAO.prazoTitulo,
    texto: TEXTOS_ACEITE_ANFITRIAO.prazoTexto,
    teste: 'orientacao-prazo',
  },
  {
    chave: 'reenvio',
    titulo: TEXTOS_ACEITE_ANFITRIAO.reenvioTitulo,
    texto: TEXTOS_ACEITE_ANFITRIAO.reenvioTexto,
    teste: 'orientacao-reenvio',
  },
  {
    chave: 'uso-unico',
    titulo: TEXTOS_ACEITE_ANFITRIAO.usoUnicoTitulo,
    texto: TEXTOS_ACEITE_ANFITRIAO.usoUnicoTexto,
    teste: 'orientacao-uso-unico',
  },
]

const store = useAutenticacaoStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()

const token = ref<string | null>(null)
const convite = ref<ConviteAcessoAnfitriaoDto | null>(null)
const carregando = ref(true)
const invalido = ref(false)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const tinhaSessao = ref(false)

const formulario = useFormulario(
  { senha: '', confirmacao: '' },
  {
    senha: [obrigatorio, senhaForte((): string => convite.value?.email ?? '')],
    confirmacao: [obrigatorio, igualA((): string => formulario.valores.senha, TEXTOS_ACEITE_ANFITRIAO.senhasDiferentes)],
  },
)

const nomes = computed(() =>
  convite.value ? formatarNomesAnfitrioes(convite.value.nomePrimeiraPessoa, convite.value.nomeSegundaPessoa) : '',
)

const vocabulario = computed(() => vocabularioDoTipo(convite.value?.tipo))

const textos = computed(() => TRATAMENTO_ACEITE_ANFITRIAO[tratamentoDoConvite(convite.value?.nomeSegundaPessoa)])

const conviteValido = computed(() => convite.value !== null && !invalido.value)

const titulo = computed(() => {
  if (invalido.value) {
    return TEXTOS_ACEITE_ANFITRIAO.invalidoTitulo
  }
  return nomes.value ? textos.value.titulo(vocabulario.value.referencia.artigo, nomes.value) : TEXTOS_ACEITE_ANFITRIAO.tituloPadrao
})

const descricao = computed(() => {
  if (invalido.value) {
    return TEXTOS_ACEITE_ANFITRIAO.invalidoTexto
  }
  return convite.value ? textos.value.descricao(convite.value.organizacao, vocabulario.value.referencia.artigo) : undefined
})

const orientacaoConvite = computed<ItemOrientacaoAcesso[]>(() => [
  {
    chave: 'convidados',
    titulo: TEXTOS_ACEITE_ANFITRIAO.convidadosTitulo,
    texto: textos.value.convidadosTexto,
    teste: 'orientacao-convidados',
  },
  {
    chave: 'confirmacoes',
    titulo: TEXTOS_ACEITE_ANFITRIAO.confirmacoesTitulo,
    texto: textos.value.confirmacoesTexto,
    teste: 'orientacao-confirmacoes',
  },
  {
    chave: 'cronograma',
    titulo: TEXTOS_ACEITE_ANFITRIAO.cronogramaTitulo,
    texto: textos.value.cronogramaTexto(vocabulario.value.referencia.contracaoDe),
    teste: 'orientacao-cronograma',
  },
  {
    chave: 'validade',
    titulo: TEXTOS_ACEITE_ANFITRIAO.validadeTitulo(formatarData(convite.value?.expiraEm)),
    texto: textos.value.validadeTexto,
    teste: 'orientacao-validade',
  },
])

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
  const resultado = await store.consultarConviteAnfitriao(token.value)
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
  const resultado = await store.aceitarConviteAnfitriao(token.value, formulario.valores.senha)
  enviando.value = false

  if (resultado.ok) {
    token.value = null
    const primeiroNome = store.usuario?.nome.split(' ')[0] ?? ''
    notificacao.sucesso(TEXTOS_ACEITE_ANFITRIAO.boasVindas(primeiroNome, vocabulario.value.referencia.contracaoDe))
    const eventoId = store.eventoDoAnfitriao
    await roteador.replace(eventoId ? { name: 'evento', params: { id: eventoId } } : { name: 'inicio' })
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

function aoDigitarSenha() {
  formulario.revalidarAoDigitar('senha')
  formulario.revalidarAoDigitar('confirmacao')
}
</script>

<template>
  <LayoutAutenticacao
    :titulo="titulo"
    :descricao="descricao"
  >
    <IndicadorAbertura
      v-if="carregando"
      :texto="TEXTOS_ACEITE_ANFITRIAO.abrindo"
    />

    <div
      v-else-if="invalido"
      class="convite-invalido"
      data-teste="convite-invalido"
    >
      <TileTipo
        tom="champanhe"
        icone="link"
        tamanho="grande"
        data-teste="lacre-convite-invalido"
      />
    </div>

    <template v-else-if="convite">
      <MensagemFormulario
        v-if="mensagemErro"
        :mensagem="mensagemErro"
      />
      <MensagemFormulario
        v-if="tinhaSessao"
        variante="informacao"
        :mensagem="textos.outraConta"
        data-teste="aviso-outra-conta"
      />
      <form
        class="pilha pilha--cartao"
        novalidate
        data-teste="formulario-aceite-anfitriao"
        @submit.prevent="enviar"
      >
        <div
          class="aceite__evento"
          data-teste="evento-convite"
        >
          <TileTipo :tipo="convite.tipo" />
          <EtiquetaTipo :tipo="convite.tipo" />
        </div>

        <dl class="aceite__email pilha pilha--campo">
          <dt class="texto-rotulo">
            {{ TEXTOS_ACEITE_ANFITRIAO.email }}
          </dt>
          <dd data-teste="email-convite">
            {{ convite.email }}
          </dd>
        </dl>

        <div class="pilha pilha--grupo">
          <CampoFormulario
            v-slot="{ id, invalido: campoInvalido, descritoPor }"
            :rotulo="TEXTOS_ACEITE_ANFITRIAO.senha"
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
              @update:model-value="aoDigitarSenha"
              @blur="formulario.validarAoSair('senha')"
            />
          </CampoFormulario>
          <CampoFormulario
            v-slot="{ id, invalido: campoInvalido, descritoPor }"
            :rotulo="textos.confirmarSenha"
            id-campo="aceite-confirmacao"
            :erro="formulario.erros.confirmacao"
          >
            <CampoSenha
              :id="id"
              v-model="formulario.valores.confirmacao"
              :invalido="campoInvalido"
              :descrito-por="descritoPor"
              autocomplete="new-password"
              @update:model-value="formulario.revalidarAoDigitar('confirmacao')"
              @blur="formulario.validarAoSair('confirmacao')"
            />
          </CampoFormulario>
        </div>

        <Button
          type="submit"
          :label="TEXTOS_ACEITE_ANFITRIAO.enviar"
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

    <template
      v-if="conviteValido || invalido"
      #complemento
    >
      <OrientacaoAcesso
        v-if="conviteValido"
        :id-titulo="ID_ORIENTACAO_CONVITE"
        :titulo="textos.orientacaoTitulo"
        :itens="orientacaoConvite"
        data-teste="orientacao-convite"
      >
        <p data-teste="nota-nao-esperava">
          <strong>{{ textos.naoEsperavaTitulo }}</strong>
          {{ textos.naoEsperavaTexto }}
        </p>
      </OrientacaoAcesso>
      <OrientacaoAcesso
        v-else
        :id-titulo="ID_CONVITE_INVALIDO"
        :titulo="TEXTOS_ACEITE_ANFITRIAO.motivoTitulo"
        :itens="ORIENTACAO_CONVITE_INVALIDO"
        data-teste="orientacao-convite-invalido"
      />
    </template>

    <template
      v-if="!conviteValido && !carregando"
      #rodape
    >
      <p>
        {{ TEXTOS_ACEITE_ANFITRIAO.jaTemConta }}
        <RouterLink
          :to="{ name: 'entrar' }"
          data-teste="link-entrar"
        >
          {{ TEXTOS_ACEITE_ANFITRIAO.entrar }}
        </RouterLink>
      </p>
    </template>
  </LayoutAutenticacao>
</template>

<style scoped>
.convite-invalido {
  display: flex;
  justify-content: center;
}

.aceite__evento {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.aceite__email {
  margin: 0;
  padding: var(--p-ritmo-grupo);
  background: var(--p-cor-superficie-sutil);
  border: 1px solid var(--p-cor-divisoria);
  border-radius: var(--p-raio-campo);
}

.aceite__email dd {
  margin: 0;
  font-family: var(--p-fonte-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}
</style>
