<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import LugarAcesso from '@/componentes/base/LugarAcesso.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ParLugares from '@/componentes/base/ParLugares.vue'
import type { ItemMenuAcoes, SituacaoLugar } from '@/componentes/base/tipos'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAcessoAnfitriaoStore } from '@/stores/acessoAnfitriao'
import type { FalhaEvento } from '@/stores/eventos'
import { ID_TITULO_ACESSO_ANFITRIAO, ROTULOS_SITUACAO_ACESSO, TEXTOS_ACESSO_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { LIMITE_ACESSOS_ANFITRIAO, type AcessoAnfitriaoDto, type SituacaoAcessoAnfitriao } from '@/tipos/acessoAnfitriao'
import { focarElemento } from '@/utilitarios/foco'
import { formatarData } from '@/utilitarios/formatacao'
import { email, obrigatorio, tamanhoMaximo, tamanhoMinimo } from '@/utilitarios/validacao'

const props = defineProps<{ eventoId: string; arquivado: boolean }>()

const SITUACAO_LUGAR: Record<SituacaoAcessoAnfitriao, SituacaoLugar> = {
  Pendente: 'pendente',
  Expirado: 'expirado',
  Ativo: 'ativo',
}

const NOMES_SLOT = ['primeiro', 'segundo'] as const

const ITENS_MENU: ItemMenuAcoes[] = [
  { chave: 'revogar', rotulo: TEXTOS_ACESSO_ANFITRIAO.revogar, icone: 'ie ie-usuario-menos', perigoso: true },
]

const store = useAcessoAnfitriaoStore()
const notificacao = useNotificacao()

const formularioAberto = ref<number | null>(null)
const enviando = ref(false)
const mensagemFormulario = ref<string | null>(null)
const reenviando = ref<string | null>(null)
const acessoRevogacao = ref<AcessoAnfitriaoDto | null>(null)
const revogando = ref(false)

const formulario = useFormulario(
  { nome: '', email: '' },
  {
    nome: [obrigatorio, tamanhoMinimo(2), tamanhoMaximo(120)],
    email: [obrigatorio, email, tamanhoMaximo(254)],
  },
)

const acessosDoEvento = computed(() => (store.eventoId === props.eventoId ? store.acessos : []))
const lugares = computed(() =>
  Array.from({ length: LIMITE_ACESSOS_ANFITRIAO }, (_, indice) => acessosDoEvento.value[indice] ?? null),
)
const falha = computed(() => (store.eventoId === props.eventoId ? store.falha : null))
const carregandoInicial = computed(() => store.carregando && acessosDoEvento.value.length === 0)

watch(
  () => props.eventoId,
  (id) => {
    formularioAberto.value = null
    void store.carregar(id)
  },
  { immediate: true },
)

function idCampo(indice: number, campo: 'nome' | 'email'): string {
  return `acesso-anfitriao-${indice}-${campo}`
}

function detalhe(acesso: AcessoAnfitriaoDto): string {
  if (acesso.situacao === 'Ativo' && acesso.aceitoEm) {
    return TEXTOS_ACESSO_ANFITRIAO.ativoDesde(formatarData(acesso.aceitoEm))
  }
  const data = formatarData(acesso.conviteExpiraEm)
  return acesso.situacao === 'Expirado' ? TEXTOS_ACESSO_ANFITRIAO.expirouEm(data) : TEXTOS_ACESSO_ANFITRIAO.expiraEm(data)
}

async function abrirFormulario(indice: number) {
  formulario.redefinir()
  mensagemFormulario.value = null
  formularioAberto.value = indice
  await nextTick()
  await focarElemento(idCampo(indice, 'nome'))
}

async function fecharFormulario(indice: number) {
  formularioAberto.value = null
  mensagemFormulario.value = null
  await nextTick()
  await focarElemento(`acesso-anfitriao-${indice}-convidar`)
}

function aplicarFalha(falhaAcao: FalhaEvento): boolean {
  if (falhaAcao.tipo === 'validacao') {
    formulario.erros.nome = falhaAcao.errosCampos.nome
    formulario.erros.email = falhaAcao.errosCampos.email
    return true
  }
  if (falhaAcao.tipo === 'regra' && falhaAcao.mensagem) {
    if (falhaAcao.mensagem.toLowerCase().includes('e-mail')) {
      formulario.erros.email = falhaAcao.mensagem
    } else {
      mensagemFormulario.value = falhaAcao.mensagem
    }
    return true
  }
  return false
}

async function enviarConvite(indice: number) {
  mensagemFormulario.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(idCampo(indice, campo))
    }
    return
  }

  enviando.value = true
  const resultado = await store.convidar(props.eventoId, {
    nome: formulario.valores.nome.trim(),
    email: formulario.valores.email.trim(),
  })
  enviando.value = false

  if (resultado.ok) {
    formularioAberto.value = null
    notificacao.sucesso(TEXTOS_ACESSO_ANFITRIAO.convidado(resultado.valor.email))
    return
  }

  if (resultado.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_ACESSO_ANFITRIAO.semPermissao)
    return
  }

  if (aplicarFalha(resultado.falha)) {
    if (formulario.erros.email) {
      await focarElemento(idCampo(indice, 'email'))
    }
    return
  }
  notificacao.erro()
}

async function reenviar(acesso: AcessoAnfitriaoDto) {
  reenviando.value = acesso.id
  const resultado = await store.reenviar(props.eventoId, acesso.id)
  reenviando.value = null

  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_ACESSO_ANFITRIAO.reenviado(resultado.valor.email))
    return
  }
  if (resultado.falha.tipo === 'regra' || resultado.falha.tipo === 'conflito') {
    notificacao.erro(resultado.falha.mensagem ?? undefined)
    void store.carregar(props.eventoId)
    return
  }
  notificacao.erro(resultado.falha.tipo === 'semPermissao' ? TEXTOS_ACESSO_ANFITRIAO.semPermissao : undefined)
}

function selecionarAcao(acesso: AcessoAnfitriaoDto, chave: string) {
  if (chave === 'revogar') {
    acessoRevogacao.value = acesso
  }
}

const mensagemRevogacao = computed(() => {
  const acesso = acessoRevogacao.value
  if (!acesso) {
    return ''
  }
  return acesso.situacao === 'Ativo'
    ? TEXTOS_ACESSO_ANFITRIAO.revogarMensagemAtivo(acesso.nome)
    : TEXTOS_ACESSO_ANFITRIAO.revogarMensagemPendente(acesso.email)
})

async function confirmarRevogacao() {
  const acesso = acessoRevogacao.value
  if (!acesso) {
    return
  }
  revogando.value = true
  const resultado = await store.revogar(props.eventoId, acesso.id)
  revogando.value = false
  acessoRevogacao.value = null

  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_ACESSO_ANFITRIAO.revogado(acesso.nome))
    return
  }
  notificacao.erro(resultado.falha.tipo === 'semPermissao' ? TEXTOS_ACESSO_ANFITRIAO.semPermissao : undefined)
  void store.carregar(props.eventoId)
}

function alterarVisibilidadeDialogo(visivel: boolean) {
  if (!visivel) {
    acessoRevogacao.value = null
  }
}
</script>

<template>
  <section
    class="acesso-anfitriao"
    :aria-labelledby="ID_TITULO_ACESSO_ANFITRIAO"
    data-teste="bloco-acesso-anfitriao"
  >
    <div class="acesso-anfitriao__cabecalho">
      <h2
        :id="ID_TITULO_ACESSO_ANFITRIAO"
        class="acesso-anfitriao__titulo"
        tabindex="-1"
      >
        {{ TEXTOS_ACESSO_ANFITRIAO.titulo }}
      </h2>
      <p class="acesso-anfitriao__descricao">
        {{ TEXTOS_ACESSO_ANFITRIAO.descricao }}
      </p>
    </div>

    <MensagemFormulario
      v-if="arquivado"
      variante="informacao"
      :mensagem="TEXTOS_ACESSO_ANFITRIAO.avisoArquivado"
      data-teste="acesso-anfitriao-arquivado"
    />

    <EstadoCarregando
      v-if="carregandoInicial"
      variante="cartao"
      :linhas="2"
    />

    <EstadoErro
      v-else-if="falha"
      :titulo="TEXTOS_ACESSO_ANFITRIAO.erroCarregar"
      :pode-tentar-novamente="falha.tipo !== 'semPermissao'"
      @tentar-novamente="store.carregar(eventoId)"
    />

    <ParLugares
      v-else
      :rotulo="TEXTOS_ACESSO_ANFITRIAO.rotuloLista"
    >
      <template
        v-for="(acesso, indice) in lugares"
        #[NOMES_SLOT[indice]]
      >
        <LugarAcesso
          v-if="acesso"
          :key="acesso.id"
          :situacao="SITUACAO_LUGAR[acesso.situacao]"
          :titulo="acesso.nome"
          :subtitulo="acesso.email"
          :rotulo-situacao="ROTULOS_SITUACAO_ACESSO[acesso.situacao]"
          :detalhe="detalhe(acesso)"
        >
          <template #acoes>
            <Button
              v-if="acesso.situacao !== 'Ativo' && !arquivado"
              :label="TEXTOS_ACESSO_ANFITRIAO.reenviar"
              icon="ie ie-enviar"
              severity="secondary"
              :text="acesso.situacao === 'Pendente'"
              :outlined="acesso.situacao === 'Expirado'"
              :loading="reenviando === acesso.id"
              data-teste="reenviar-convite"
              @click="reenviar(acesso)"
            />
            <MenuAcoes
              :itens="ITENS_MENU"
              :rotulo="TEXTOS_ACESSO_ANFITRIAO.acoesLugar(acesso.nome)"
              :rotulo-acessivel="TEXTOS_ACESSO_ANFITRIAO.acoesLugar(acesso.nome)"
              data-teste="menu-acesso"
              @selecionar="selecionarAcao(acesso, $event)"
            />
          </template>
        </LugarAcesso>

        <LugarAcesso
          v-else
          :key="`vazio-${indice}`"
          situacao="vazio"
          :titulo="TEXTOS_ACESSO_ANFITRIAO.lugarVazio"
          :subtitulo="formularioAberto === indice ? undefined : TEXTOS_ACESSO_ANFITRIAO.lugarVazioApoio"
        >
          <form
            v-if="formularioAberto === indice"
            class="acesso-anfitriao__formulario"
            novalidate
            data-teste="formulario-convite-anfitriao"
            @submit.prevent="enviarConvite(indice)"
          >
            <MensagemFormulario
              v-if="mensagemFormulario"
              :mensagem="mensagemFormulario"
            />
            <CampoFormulario
              v-slot="{ id, invalido, descritoPor }"
              :rotulo="TEXTOS_ACESSO_ANFITRIAO.campoNome"
              :id-campo="idCampo(indice, 'nome')"
              obrigatorio
              :erro="formulario.erros.nome"
            >
              <InputText
                :id="id"
                v-model="formulario.valores.nome"
                :invalid="invalido"
                :aria-invalid="invalido"
                :aria-describedby="descritoPor"
                autocomplete="name"
                maxlength="120"
                fluid
                @update:model-value="formulario.revalidarAoDigitar('nome')"
                @blur="formulario.validarAoSair('nome')"
              />
            </CampoFormulario>
            <CampoFormulario
              v-slot="{ id, invalido, descritoPor }"
              :rotulo="TEXTOS_ACESSO_ANFITRIAO.campoEmail"
              :id-campo="idCampo(indice, 'email')"
              obrigatorio
              :dica="TEXTOS_ACESSO_ANFITRIAO.dicaEmail"
              :erro="formulario.erros.email"
            >
              <InputText
                :id="id"
                v-model="formulario.valores.email"
                type="email"
                inputmode="email"
                :invalid="invalido"
                :aria-invalid="invalido"
                :aria-describedby="descritoPor"
                autocomplete="email"
                maxlength="254"
                fluid
                @update:model-value="formulario.revalidarAoDigitar('email')"
                @blur="formulario.validarAoSair('email')"
              />
            </CampoFormulario>
            <div class="acesso-anfitriao__acoes-formulario">
              <Button
                type="submit"
                :label="TEXTOS_ACESSO_ANFITRIAO.enviarConvite"
                icon="ie ie-email"
                severity="secondary"
                :loading="enviando"
                data-teste="enviar-convite-anfitriao"
              />
              <Button
                type="button"
                :label="TEXTOS_ACESSO_ANFITRIAO.cancelar"
                severity="secondary"
                text
                :disabled="enviando"
                data-teste="cancelar-convite-anfitriao"
                @click="fecharFormulario(indice)"
              />
            </div>
          </form>

          <template
            v-if="formularioAberto !== indice && !arquivado"
            #acoes
          >
            <Button
              :id="`acesso-anfitriao-${indice}-convidar`"
              :label="TEXTOS_ACESSO_ANFITRIAO.convidar"
              icon="ie ie-usuario-mais"
              severity="secondary"
              outlined
              data-teste="convidar-anfitriao"
              @click="abrirFormulario(indice)"
            />
          </template>
        </LugarAcesso>
      </template>
    </ParLugares>

    <DialogoConfirmacao
      :visivel="acessoRevogacao !== null"
      :titulo="acessoRevogacao ? TEXTOS_ACESSO_ANFITRIAO.revogarTitulo(acessoRevogacao.nome) : ''"
      :mensagem="mensagemRevogacao"
      :rotulo-confirmar="TEXTOS_ACESSO_ANFITRIAO.revogar"
      :rotulo-cancelar="TEXTOS_ACESSO_ANFITRIAO.cancelar"
      :executando="revogando"
      perigoso
      @update:visivel="alterarVisibilidadeDialogo"
      @confirmar="confirmarRevogacao"
    />
  </section>
</template>

<style scoped>
.acesso-anfitriao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.acesso-anfitriao__cabecalho {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.acesso-anfitriao__titulo {
  font-size: var(--p-fonte-tamanho-secao);
}

.acesso-anfitriao__descricao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.acesso-anfitriao__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.acesso-anfitriao__acoes-formulario {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}
</style>
