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
import { useAcessoCasalStore } from '@/stores/acessoCasal'
import type { FalhaCasamento } from '@/stores/casamentos'
import { ID_TITULO_ACESSO_CASAL, ROTULOS_SITUACAO_ACESSO, TEXTOS_ACESSO_CASAL } from '@/textos/acessoCasal'
import { LIMITE_ACESSOS_CASAL, type AcessoCasalDto, type SituacaoAcessoCasal } from '@/tipos/acessoCasal'
import { focarElemento } from '@/utilitarios/foco'
import { formatarData } from '@/utilitarios/formatacao'
import { email, obrigatorio, tamanhoMaximo, tamanhoMinimo } from '@/utilitarios/validacao'

const props = defineProps<{ casamentoId: string; arquivado: boolean }>()

const SITUACAO_LUGAR: Record<SituacaoAcessoCasal, SituacaoLugar> = {
  Pendente: 'pendente',
  Expirado: 'expirado',
  Ativo: 'ativo',
}

const NOMES_SLOT = ['primeiro', 'segundo'] as const

const ITENS_MENU: ItemMenuAcoes[] = [
  { chave: 'revogar', rotulo: TEXTOS_ACESSO_CASAL.revogar, icone: 'ie ie-usuario-menos', perigoso: true },
]

const store = useAcessoCasalStore()
const notificacao = useNotificacao()

const formularioAberto = ref<number | null>(null)
const enviando = ref(false)
const mensagemFormulario = ref<string | null>(null)
const reenviando = ref<string | null>(null)
const acessoRevogacao = ref<AcessoCasalDto | null>(null)
const revogando = ref(false)

const formulario = useFormulario(
  { nome: '', email: '' },
  {
    nome: [obrigatorio, tamanhoMinimo(2), tamanhoMaximo(120)],
    email: [obrigatorio, email, tamanhoMaximo(254)],
  },
)

const acessosDoCasamento = computed(() => (store.casamentoId === props.casamentoId ? store.acessos : []))
const lugares = computed(() =>
  Array.from({ length: LIMITE_ACESSOS_CASAL }, (_, indice) => acessosDoCasamento.value[indice] ?? null),
)
const falha = computed(() => (store.casamentoId === props.casamentoId ? store.falha : null))
const carregandoInicial = computed(() => store.carregando && acessosDoCasamento.value.length === 0)

watch(
  () => props.casamentoId,
  (id) => {
    formularioAberto.value = null
    void store.carregar(id)
  },
  { immediate: true },
)

function idCampo(indice: number, campo: 'nome' | 'email'): string {
  return `acesso-casal-${indice}-${campo}`
}

function detalhe(acesso: AcessoCasalDto): string {
  if (acesso.situacao === 'Ativo' && acesso.aceitoEm) {
    return TEXTOS_ACESSO_CASAL.ativoDesde(formatarData(acesso.aceitoEm))
  }
  const data = formatarData(acesso.conviteExpiraEm)
  return acesso.situacao === 'Expirado' ? TEXTOS_ACESSO_CASAL.expirouEm(data) : TEXTOS_ACESSO_CASAL.expiraEm(data)
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
  await focarElemento(`acesso-casal-${indice}-convidar`)
}

function aplicarFalha(falhaAcao: FalhaCasamento): boolean {
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
  const resultado = await store.convidar(props.casamentoId, {
    nome: formulario.valores.nome.trim(),
    email: formulario.valores.email.trim(),
  })
  enviando.value = false

  if (resultado.ok) {
    formularioAberto.value = null
    notificacao.sucesso(TEXTOS_ACESSO_CASAL.convidado(resultado.valor.email))
    return
  }

  if (resultado.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_ACESSO_CASAL.semPermissao)
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

async function reenviar(acesso: AcessoCasalDto) {
  reenviando.value = acesso.id
  const resultado = await store.reenviar(props.casamentoId, acesso.id)
  reenviando.value = null

  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_ACESSO_CASAL.reenviado(resultado.valor.email))
    return
  }
  if (resultado.falha.tipo === 'regra' || resultado.falha.tipo === 'conflito') {
    notificacao.erro(resultado.falha.mensagem ?? undefined)
    void store.carregar(props.casamentoId)
    return
  }
  notificacao.erro(resultado.falha.tipo === 'semPermissao' ? TEXTOS_ACESSO_CASAL.semPermissao : undefined)
}

function selecionarAcao(acesso: AcessoCasalDto, chave: string) {
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
    ? TEXTOS_ACESSO_CASAL.revogarMensagemAtivo(acesso.nome)
    : TEXTOS_ACESSO_CASAL.revogarMensagemPendente(acesso.email)
})

async function confirmarRevogacao() {
  const acesso = acessoRevogacao.value
  if (!acesso) {
    return
  }
  revogando.value = true
  const resultado = await store.revogar(props.casamentoId, acesso.id)
  revogando.value = false
  acessoRevogacao.value = null

  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_ACESSO_CASAL.revogado(acesso.nome))
    return
  }
  notificacao.erro(resultado.falha.tipo === 'semPermissao' ? TEXTOS_ACESSO_CASAL.semPermissao : undefined)
  void store.carregar(props.casamentoId)
}

function alterarVisibilidadeDialogo(visivel: boolean) {
  if (!visivel) {
    acessoRevogacao.value = null
  }
}
</script>

<template>
  <section
    class="acesso-casal"
    :aria-labelledby="ID_TITULO_ACESSO_CASAL"
    data-teste="bloco-acesso-casal"
  >
    <div class="acesso-casal__cabecalho">
      <h2
        :id="ID_TITULO_ACESSO_CASAL"
        class="acesso-casal__titulo"
        tabindex="-1"
      >
        {{ TEXTOS_ACESSO_CASAL.titulo }}
      </h2>
      <p class="acesso-casal__descricao">
        {{ TEXTOS_ACESSO_CASAL.descricao }}
      </p>
    </div>

    <MensagemFormulario
      v-if="arquivado"
      variante="informacao"
      :mensagem="TEXTOS_ACESSO_CASAL.avisoArquivado"
      data-teste="acesso-casal-arquivado"
    />

    <EstadoCarregando
      v-if="carregandoInicial"
      variante="cartao"
      :linhas="2"
    />

    <EstadoErro
      v-else-if="falha"
      :titulo="TEXTOS_ACESSO_CASAL.erroCarregar"
      :pode-tentar-novamente="falha.tipo !== 'semPermissao'"
      @tentar-novamente="store.carregar(casamentoId)"
    />

    <ParLugares
      v-else
      :rotulo="TEXTOS_ACESSO_CASAL.rotuloLista"
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
              :label="TEXTOS_ACESSO_CASAL.reenviar"
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
              :rotulo="TEXTOS_ACESSO_CASAL.acoesLugar(acesso.nome)"
              :rotulo-acessivel="TEXTOS_ACESSO_CASAL.acoesLugar(acesso.nome)"
              data-teste="menu-acesso"
              @selecionar="selecionarAcao(acesso, $event)"
            />
          </template>
        </LugarAcesso>

        <LugarAcesso
          v-else
          :key="`vazio-${indice}`"
          situacao="vazio"
          :titulo="TEXTOS_ACESSO_CASAL.lugarVazio"
          :subtitulo="formularioAberto === indice ? undefined : TEXTOS_ACESSO_CASAL.lugarVazioApoio"
        >
          <form
            v-if="formularioAberto === indice"
            class="acesso-casal__formulario"
            novalidate
            data-teste="formulario-convite-casal"
            @submit.prevent="enviarConvite(indice)"
          >
            <MensagemFormulario
              v-if="mensagemFormulario"
              :mensagem="mensagemFormulario"
            />
            <CampoFormulario
              v-slot="{ id, invalido, descritoPor }"
              :rotulo="TEXTOS_ACESSO_CASAL.campoNome"
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
                @blur="formulario.validarCampo('nome')"
              />
            </CampoFormulario>
            <CampoFormulario
              v-slot="{ id, invalido, descritoPor }"
              :rotulo="TEXTOS_ACESSO_CASAL.campoEmail"
              :id-campo="idCampo(indice, 'email')"
              obrigatorio
              :dica="TEXTOS_ACESSO_CASAL.dicaEmail"
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
                @blur="formulario.validarCampo('email')"
              />
            </CampoFormulario>
            <div class="acesso-casal__acoes-formulario">
              <Button
                type="submit"
                :label="TEXTOS_ACESSO_CASAL.enviarConvite"
                icon="ie ie-email"
                severity="secondary"
                :loading="enviando"
                data-teste="enviar-convite-casal"
              />
              <Button
                type="button"
                :label="TEXTOS_ACESSO_CASAL.cancelar"
                severity="secondary"
                text
                :disabled="enviando"
                data-teste="cancelar-convite-casal"
                @click="fecharFormulario(indice)"
              />
            </div>
          </form>

          <template
            v-if="formularioAberto !== indice && !arquivado"
            #acoes
          >
            <Button
              :id="`acesso-casal-${indice}-convidar`"
              :label="TEXTOS_ACESSO_CASAL.convidar"
              icon="ie ie-usuario-mais"
              severity="secondary"
              outlined
              data-teste="convidar-casal"
              @click="abrirFormulario(indice)"
            />
          </template>
        </LugarAcesso>
      </template>
    </ParLugares>

    <DialogoConfirmacao
      :visivel="acessoRevogacao !== null"
      :titulo="acessoRevogacao ? TEXTOS_ACESSO_CASAL.revogarTitulo(acessoRevogacao.nome) : ''"
      :mensagem="mensagemRevogacao"
      :rotulo-confirmar="TEXTOS_ACESSO_CASAL.revogar"
      :rotulo-cancelar="TEXTOS_ACESSO_CASAL.cancelar"
      :executando="revogando"
      perigoso
      @update:visivel="alterarVisibilidadeDialogo"
      @confirmar="confirmarRevogacao"
    />
  </section>
</template>

<style scoped>
.acesso-casal {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.acesso-casal__cabecalho {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.acesso-casal__titulo {
  font-size: var(--p-fonte-tamanho-secao);
}

.acesso-casal__descricao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.acesso-casal__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.acesso-casal__acoes-formulario {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}
</style>
