<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'

import LayoutPublico from '@/layouts/LayoutPublico.vue'
import AvisoPrivacidade from '@/componentes/base/AvisoPrivacidade.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import BarraAcaoFixa from '@/componentes/base/BarraAcaoFixa.vue'
import CaixaConsentimento from '@/componentes/base/CaixaConsentimento.vue'
import CabecalhoConvite from '@/componentes/base/CabecalhoConvite.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EscolhaPresenca from '@/componentes/base/EscolhaPresenca.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ListaRepetivel from '@/componentes/base/ListaRepetivel.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import SeloConfirmacao from '@/componentes/base/SeloConfirmacao.vue'
import SeletorRestricaoAlimentar from '@/componentes/base/SeletorRestricaoAlimentar.vue'
import ParaODiaRsvp from '@/componentes/rsvp/ParaODiaRsvp.vue'
import { TEXTOS_PREVIA_RSVP } from '@/textos/confirmacoes'
import { useRsvpStore } from '@/stores/rsvp'
import { TEXTOS_DADOS_SENSIVEIS, VERSAO_TERMO_PRIVACIDADE } from '@/textos/dadosSensiveis'
import { TEXTOS_LISTA_ACOMPANHANTES, TEXTOS_RSVP } from '@/textos/rsvp'
import type { FaixaEtaria } from '@/tipos/convidados'
import type { RestricaoPessoaFormulario } from '@/tipos/dadosSensiveis'
import type { EscolhaPresencaRsvp, RsvpPublicoDto } from '@/tipos/rsvp'
import { hojeEmSaoPaulo } from '@/utilitarios/dataCalendario'
import { informaConteudo, restricaoParaEnvio, restricaoVazia, validarRestricao } from '@/utilitarios/dadosSensiveis'
import { PARAMETRO_PREVIA_RSVP, escolhaInicial, formatarDiaMes, tokenRsvpValido } from '@/utilitarios/rsvp'

interface AcompanhanteFormulario {
  chave: string
  id: string | null
  nome: string
  faixaEtaria: FaixaEtaria
  erro: string | null
  restricao: RestricaoPessoaFormulario
  possuiRegistro: boolean
  erroRestricao: string | null
}

const TAMANHO_MINIMO_NOME = 2
const TAMANHO_MAXIMO_NOME = 120

const props = defineProps<{ token: string }>()

const rota = useRoute()
const preVisualizacao = computed(() => rota.query[PARAMETRO_PREVIA_RSVP] === '1')

const store = useRsvpStore()

const modo = ref<'formulario' | 'resumo'>('formulario')
const recemEnviado = ref(false)
const escolhas = reactive<Record<string, EscolhaPresencaRsvp | null>>({})
const errosEscolha = reactive<Record<string, string | null>>({})
const acompanhantes = ref<AcompanhanteFormulario[]>([])
const restricoes = reactive<Record<string, RestricaoPessoaFormulario>>({})
const errosRestricao = reactive<Record<string, string | null>>({})
const consentimento = ref(false)
const erroConsentimento = ref<string | null>(null)
const caixaConsentimento = ref<InstanceType<typeof CaixaConsentimento> | null>(null)
const mensagemErro = ref<string | null>(null)
const aviso = ref<string | null>(null)
const selo = ref<InstanceType<typeof SeloConfirmacao> | null>(null)
let proximaChave = 0

const opcoesFaixa: { rotulo: string; valor: FaixaEtaria }[] = [
  { rotulo: TEXTOS_RSVP.adulto, valor: 'Adulto' },
  { rotulo: TEXTOS_RSVP.criancaOpcao, valor: 'Crianca' },
]

const tokenValido = computed(() => tokenRsvpValido(props.token))
const dados = computed(() => (tokenValido.value ? store.dados : null))
const pessoas = computed(() => dados.value?.pessoas ?? [])
const quantosVao = computed(() => pessoas.value.filter((pessoa) => escolhas[pessoa.id] === 'Confirmado').length)
const faltam = computed(() => pessoas.value.filter((pessoa) => !escolhas[pessoa.id]).length)
const alguemVai = computed(() => quantosVao.value > 0)
const podeLevarAcompanhantes = computed(() => (dados.value?.limiteAcompanhantes ?? 0) > 0 && alguemVai.value)
const informaDadosSensiveis = computed(
  () =>
    pessoas.value.some((pessoa) => escolhas[pessoa.id] === 'Confirmado' && informaConteudo(restricaoDe(pessoa.id))) ||
    (alguemVai.value && acompanhantes.value.some((acompanhante) => informaConteudo(acompanhante.restricao))),
)
const prazo = computed(() => (dados.value ? formatarDiaMes(dados.value.dataLimiteResposta) : ''))
const statusBarra = computed(() =>
  faltam.value > 0 ? TEXTOS_RSVP.faltam(faltam.value) : TEXTOS_RSVP.contador(quantosVao.value, pessoas.value.length),
)

const estadoErro = computed(() => {
  if (!tokenValido.value || store.falha?.tipo === 'linkInativo') {
    return { titulo: TEXTOS_RSVP.linkInativoTitulo, mensagem: TEXTOS_RSVP.linkInativoTexto, tentar: false }
  }
  if (store.falha?.tipo === 'muitasTentativas') {
    return { titulo: TEXTOS_RSVP.muitasTentativasTitulo, mensagem: TEXTOS_RSVP.muitasTentativas, tentar: true }
  }
  if (store.falha) {
    return { titulo: TEXTOS_RSVP.erroCarregarTitulo, mensagem: TEXTOS_RSVP.erroCarregar, tentar: true }
  }
  return null
})

const conviteAmplo = computed(() => Boolean(dados.value) && !estadoErro.value)
const hoje = hojeEmSaoPaulo()

function novaChave(): string {
  proximaChave += 1
  return `acompanhante-${proximaChave}`
}

function restricaoDe(id: string): RestricaoPessoaFormulario {
  return restricoes[id] ?? restricaoVazia()
}

function alterarRestricao(id: string, restricao: RestricaoPessoaFormulario) {
  restricoes[id] = restricao
  errosRestricao[id] = null
}

function preencher(valor: RsvpPublicoDto) {
  for (const chave of Object.keys(escolhas)) {
    Reflect.deleteProperty(escolhas, chave)
    Reflect.deleteProperty(errosEscolha, chave)
  }
  for (const chave of Object.keys(restricoes)) {
    Reflect.deleteProperty(restricoes, chave)
    Reflect.deleteProperty(errosRestricao, chave)
  }
  for (const pessoa of valor.pessoas) {
    escolhas[pessoa.id] = escolhaInicial(pessoa)
    errosEscolha[pessoa.id] = null
    restricoes[pessoa.id] = restricaoVazia()
    errosRestricao[pessoa.id] = null
  }
  acompanhantes.value = valor.acompanhantes.map((acompanhante) => ({
    chave: novaChave(),
    id: acompanhante.id,
    nome: acompanhante.nome,
    faixaEtaria: acompanhante.faixaEtaria,
    erro: null,
    restricao: restricaoVazia(),
    possuiRegistro: acompanhante.possuiRestricao,
    erroRestricao: null,
  }))
  consentimento.value = false
  erroConsentimento.value = null
  modo.value = valor.respondidoEm || !valor.podeResponder ? 'resumo' : 'formulario'
}

async function carregar() {
  recemEnviado.value = false
  mensagemErro.value = null
  aviso.value = null
  if (!tokenValido.value) {
    store.limpar()
    return
  }
  await store.consultar(props.token, { preVisualizacao: preVisualizacao.value })
  if (store.dados) {
    preencher(store.dados)
  }
}

watch(() => props.token, carregar, { immediate: true })

watch(informaDadosSensiveis, (informa) => {
  if (!informa) {
    erroConsentimento.value = null
  }
})

watch(consentimento, (marcado) => {
  if (marcado) {
    erroConsentimento.value = null
  }
})

watch(alguemVai, (vai) => {
  if (!vai && acompanhantes.value.length > 0 && modo.value === 'formulario') {
    acompanhantes.value = []
    aviso.value = TEXTOS_RSVP.acompanhantesRetirados
  }
})

function idPessoa(id: string): string {
  return `rsvp-pessoa-${id}`
}

function marcarTodos(escolha: EscolhaPresencaRsvp) {
  for (const pessoa of pessoas.value) {
    escolhas[pessoa.id] = escolha
    errosEscolha[pessoa.id] = null
  }
}

function alterarEscolha(id: string, escolha: EscolhaPresencaRsvp | null) {
  escolhas[id] = escolha
  errosEscolha[id] = null
}

function adicionarAcompanhante() {
  acompanhantes.value = [
    ...acompanhantes.value,
    {
      chave: novaChave(),
      id: null,
      nome: '',
      faixaEtaria: 'Adulto',
      erro: null,
      restricao: restricaoVazia(),
      possuiRegistro: false,
      erroRestricao: null,
    },
  ]
  aviso.value = null
}

function removerAcompanhante(indice: number) {
  acompanhantes.value = acompanhantes.value.filter((_, posicao) => posicao !== indice)
}

function validarAcompanhantes(): boolean {
  let valido = true
  for (const acompanhante of acompanhantes.value) {
    const tamanho = acompanhante.nome.trim().length
    acompanhante.erro = tamanho < TAMANHO_MINIMO_NOME || tamanho > TAMANHO_MAXIMO_NOME ? TEXTOS_RSVP.erroNomeAcompanhante : null
    valido &&= acompanhante.erro === null
  }
  return valido
}

function validarRestricoes(): string | null {
  let primeiro: string | null = null
  for (const pessoa of pessoas.value) {
    const erro = escolhas[pessoa.id] === 'Confirmado' ? validarRestricao(restricaoDe(pessoa.id)) : null
    errosRestricao[pessoa.id] = erro
    if (erro && !primeiro) {
      primeiro = `rsvp-restricao-${pessoa.id}-outra`
    }
  }
  acompanhantes.value.forEach((acompanhante, indice) => {
    acompanhante.erroRestricao = validarRestricao(acompanhante.restricao)
    if (acompanhante.erroRestricao && !primeiro) {
      primeiro = `rsvp-restricao-acompanhante-${indice}-outra`
    }
  })
  return primeiro
}

async function focarPorId(id: string) {
  await nextTick()
  document.getElementById(id)?.focus()
}

async function enviar() {
  mensagemErro.value = null
  const semEscolha = pessoas.value.filter((pessoa) => !escolhas[pessoa.id])
  for (const pessoa of semEscolha) {
    errosEscolha[pessoa.id] = TEXTOS_RSVP.faltaEscolha
  }
  const primeiraSemEscolha = semEscolha[0]
  if (primeiraSemEscolha) {
    await focarPorId(idPessoa(primeiraSemEscolha.id))
    return
  }
  if (!validarAcompanhantes()) {
    const indice = acompanhantes.value.findIndex((acompanhante) => acompanhante.erro)
    await focarPorId(`rsvp-acompanhante-${indice}`)
    return
  }

  const primeiraRestricaoInvalida = validarRestricoes()
  if (primeiraRestricaoInvalida) {
    await focarPorId(primeiraRestricaoInvalida)
    return
  }
  if (informaDadosSensiveis.value && !consentimento.value) {
    erroConsentimento.value = TEXTOS_DADOS_SENSIVEIS.erroConsentimento
    await nextTick()
    caixaConsentimento.value?.focar()
    return
  }

  const resultado = await store.responder({
    token: props.token,
    pessoas: pessoas.value.map((pessoa) => {
      const resposta = escolhas[pessoa.id] as EscolhaPresencaRsvp
      const restricao = resposta === 'Confirmado' ? restricaoParaEnvio(restricaoDe(pessoa.id)) : undefined
      return restricao ? { id: pessoa.id, resposta, restricao } : { id: pessoa.id, resposta }
    }),
    acompanhantes: alguemVai.value
      ? acompanhantes.value.map((acompanhante) => {
          const restricao = restricaoParaEnvio(acompanhante.restricao)
          const base = { id: acompanhante.id, nome: acompanhante.nome.trim(), faixaEtaria: acompanhante.faixaEtaria }
          return restricao ? { ...base, restricao } : base
        })
      : [],
    ...(informaDadosSensiveis.value ? { consentimento: { aceito: true, versaoTermo: VERSAO_TERMO_PRIVACIDADE } } : {}),
  })

  if (resultado.ok) {
    preencher(resultado.valor)
    modo.value = 'resumo'
    recemEnviado.value = true
    await nextTick()
    selo.value?.focar()
    return
  }

  const falha = resultado.falha
  if (falha.tipo === 'linkInativo') {
    store.falha = falha
    return
  }
  if (falha.tipo === 'conflito') {
    await carregar()
    aviso.value = TEXTOS_RSVP.conflito
    return
  }
  if (falha.tipo === 'regra') {
    mensagemErro.value = falha.mensagem
    const anterior = store.dados
    await store.consultar(props.token, { preVisualizacao: preVisualizacao.value })
    if (store.dados && !store.dados.podeResponder) {
      preencher(store.dados)
    } else if (anterior) {
      store.dados = anterior
    }
    await focarPorId('rsvp-mensagem-erro')
    return
  }
  mensagemErro.value = falha.tipo === 'muitasTentativas' ? TEXTOS_RSVP.muitasTentativas : TEXTOS_RSVP.erroEnviar
  await focarPorId('rsvp-mensagem-erro')
}

function alterarResposta() {
  recemEnviado.value = false
  modo.value = 'formulario'
  mensagemErro.value = null
}
</script>

<template>
  <LayoutPublico
    variante="convite"
    :amplo="conviteAmplo"
  >
    <EstadoCarregando
      v-if="store.carregando && !dados"
      variante="cartao"
      :linhas="3"
    />

    <EstadoErro
      v-else-if="estadoErro"
      :titulo="estadoErro.titulo"
      :mensagem="estadoErro.mensagem"
      :pode-tentar-novamente="estadoErro.tentar"
      @tentar-novamente="carregar"
    />

    <div
      v-else-if="dados"
      class="rsvp"
    >
      <div class="rsvp__grade">
        <div class="rsvp__coluna-convite">
          <CabecalhoConvite
            :primeiro="dados.evento.nomePrimeiraPessoa"
            :segundo="dados.evento.nomeSegundaPessoa"
            :tipo="dados.evento.tipo"
            :data="dados.evento.data"
            :horario="dados.evento.horario"
            :local-cerimonia="dados.evento.localCerimonia"
            :local-recepcao="dados.evento.localRecepcao"
            :variante="modo === 'resumo' && recemEnviado ? 'compacto' : 'completo'"
          />
        </div>

        <div class="rsvp__principal pilha pilha--bloco">
          <MensagemFormulario
            v-if="dados.preVisualizacao"
            variante="informacao"
            :mensagem="TEXTOS_PREVIA_RSVP.faixa"
            role="status"
            data-teste="rsvp-previa"
          />

          <MensagemFormulario
            v-if="aviso"
            variante="informacao"
            :mensagem="aviso"
            data-teste="rsvp-aviso"
          />

          <section
            v-if="modo === 'resumo'"
            class="rsvp__resumo pilha pilha--cartao"
            data-teste="rsvp-resumo"
          >
            <SeloConfirmacao
              ref="selo"
              :titulo="recemEnviado ? TEXTOS_RSVP.enviada : TEXTOS_RSVP.suaResposta"
              :animado="recemEnviado"
            >
              <p v-if="recemEnviado">
                {{ TEXTOS_RSVP.obrigado(dados.nomeConvite) }}
              </p>
              <p v-else>
                {{ dados.nomeConvite }}
              </p>
            </SeloConfirmacao>

            <ul class="rsvp__lista-resumo">
              <li
                v-for="pessoa in dados.pessoas"
                :key="pessoa.id"
                class="rsvp__linha-resumo"
                data-teste="rsvp-linha-resumo"
              >
                <span class="rsvp__nome-resumo">
                  <span>{{ pessoa.nome }}</span>
                  <BadgeStatus
                    v-if="pessoa.possuiRestricao"
                    :texto="TEXTOS_DADOS_SENSIVEIS.registrada"
                    variante="informacao"
                    data-teste="rsvp-resumo-restricao"
                  />
                </span>
                <span
                  class="rsvp__resposta-resumo"
                  :class="{ 'rsvp__resposta-resumo--vai': pessoa.resposta === 'Confirmado' }"
                >{{ pessoa.resposta === 'Confirmado' ? TEXTOS_RSVP.vai : TEXTOS_RSVP.naoVai }}</span>
              </li>
              <li
                v-for="acompanhante in dados.acompanhantes"
                :key="acompanhante.id"
                class="rsvp__linha-resumo"
                data-teste="rsvp-linha-resumo"
              >
                <span class="rsvp__nome-resumo">
                  <span>{{ TEXTOS_RSVP.resumoAcompanhante(acompanhante.nome) }}</span>
                  <BadgeStatus
                    v-if="acompanhante.possuiRestricao"
                    :texto="TEXTOS_DADOS_SENSIVEIS.registrada"
                    variante="informacao"
                    data-teste="rsvp-resumo-restricao"
                  />
                </span>
                <span class="rsvp__resposta-resumo rsvp__resposta-resumo--vai">{{ TEXTOS_RSVP.vai }}</span>
              </li>
            </ul>

            <div
              v-if="dados.podeResponder"
              class="rsvp__alterar pilha pilha--grupo"
            >
              <p class="texto-legenda">
                {{ TEXTOS_RSVP.podeAlterar(prazo) }}
              </p>
              <Button
                :label="TEXTOS_RSVP.alterar"
                severity="secondary"
                outlined
                data-teste="rsvp-alterar"
                @click="alterarResposta"
              />
            </div>
            <MensagemFormulario
              v-else
              variante="informacao"
              :mensagem="TEXTOS_RSVP.prazoEncerrado(prazo)"
              data-teste="rsvp-prazo-encerrado"
            />
          </section>

          <form
            v-else
            class="rsvp__formulario pilha pilha--bloco"
            novalidate
            data-teste="rsvp-formulario"
            @submit.prevent="enviar"
          >
            <div class="rsvp__convite pilha pilha--campo">
              <p class="texto-rotulo">
                {{ TEXTOS_RSVP.conviteDe }}
              </p>
              <h2 class="rsvp__nome-convite">
                {{ dados.nomeConvite }}
              </h2>
              <p class="texto-legenda">
                {{ TEXTOS_RSVP.prazo(prazo) }}
              </p>
            </div>

            <section
              class="rsvp__pessoas pilha pilha--campo"
              aria-labelledby="rsvp-titulo-pessoas"
            >
              <div class="rsvp__titulo-secao">
                <h3
                  id="rsvp-titulo-pessoas"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_RSVP.quemVai }}
                </h3>
                <Button
                  type="button"
                  :label="TEXTOS_RSVP.todosVao"
                  text
                  :disabled="store.enviando"
                  data-teste="rsvp-todos-vao"
                  @click="marcarTodos('Confirmado')"
                />
              </div>
              <ul class="rsvp__lista-pessoas">
                <li
                  v-for="pessoa in dados.pessoas"
                  :key="pessoa.id"
                  class="rsvp__pessoa"
                  data-teste="rsvp-pessoa"
                >
                  <EscolhaPresenca
                    :model-value="escolhas[pessoa.id] ?? null"
                    :id-grupo="idPessoa(pessoa.id)"
                    :nome="pessoa.nome"
                    :marcador="pessoa.faixaEtaria === 'Crianca' ? TEXTOS_RSVP.crianca : null"
                    :erro="errosEscolha[pessoa.id]"
                    :desabilitado="store.enviando"
                    @update:model-value="alterarEscolha(pessoa.id, $event)"
                  >
                    <SeletorRestricaoAlimentar
                      v-if="escolhas[pessoa.id] === 'Confirmado'"
                      :model-value="restricaoDe(pessoa.id)"
                      :nome="pessoa.nome"
                      :possui-registro="pessoa.possuiRestricao"
                      :erro="errosRestricao[pessoa.id] ?? null"
                      :desabilitado="store.enviando"
                      :id-base="`rsvp-restricao-${pessoa.id}`"
                      @update:model-value="alterarRestricao(pessoa.id, $event)"
                    />
                    <p
                      v-else-if="escolhas[pessoa.id] === 'Recusado' && pessoa.possuiRestricao"
                      class="texto-legenda"
                      data-teste="rsvp-restricao-sera-apagada"
                    >
                      {{ TEXTOS_DADOS_SENSIVEIS.seraApagadaRecusa(pessoa.nome) }}
                    </p>
                  </EscolhaPresenca>
                </li>
              </ul>
              <Button
                type="button"
                class="rsvp__ninguem"
                :label="TEXTOS_RSVP.ninguemVai"
                text
                severity="secondary"
                :disabled="store.enviando"
                data-teste="rsvp-ninguem-vai"
                @click="marcarTodos('Recusado')"
              />
            </section>

            <section
              v-if="podeLevarAcompanhantes"
              class="rsvp__acompanhantes pilha pilha--grupo"
              aria-labelledby="rsvp-titulo-acompanhantes"
              data-teste="rsvp-acompanhantes"
            >
              <div class="pilha pilha--campo">
                <h3
                  id="rsvp-titulo-acompanhantes"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_RSVP.acompanhantesTitulo }}
                </h3>
                <p class="texto-legenda">
                  {{ TEXTOS_RSVP.acompanhantesLimite(dados.limiteAcompanhantes) }}
                </p>
              </div>
              <ListaRepetivel
                :itens="acompanhantes"
                :chave="(acompanhante) => acompanhante.chave"
                :textos="TEXTOS_LISTA_ACOMPANHANTES"
                :minimo="0"
                :maximo="dados.limiteAcompanhantes"
                :desabilitado="store.enviando"
                @adicionar="adicionarAcompanhante"
                @remover="removerAcompanhante"
              >
                <template #default="{ item, indice }">
                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_RSVP.nomeAcompanhante"
                    :id-campo="`rsvp-acompanhante-${indice}`"
                    obrigatorio
                    :erro="item.erro"
                  >
                    <InputText
                      :id="idEntrada"
                      v-model="item.nome"
                      :placeholder="TEXTOS_RSVP.placeholderNome"
                      autocomplete="off"
                      maxlength="120"
                      aria-required="true"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      data-teste="rsvp-nome-acompanhante"
                    />
                  </CampoFormulario>
                  <div
                    class="rsvp__opcoes pilha pilha--campo"
                    role="group"
                    :aria-labelledby="`rsvp-faixa-acompanhante-${indice}-rotulo`"
                  >
                    <span
                      :id="`rsvp-faixa-acompanhante-${indice}-rotulo`"
                      class="rsvp__rotulo-opcoes"
                      data-teste="rsvp-rotulo-faixa-acompanhante"
                    >{{ TEXTOS_RSVP.faixaAcompanhante }}</span>
                    <SelectButton
                      v-model="item.faixaEtaria"
                      :options="opcoesFaixa"
                      option-label="rotulo"
                      option-value="valor"
                      :allow-empty="false"
                      :aria-labelledby="`rsvp-faixa-acompanhante-${indice}-rotulo`"
                      data-teste="rsvp-faixa-acompanhante"
                    />
                  </div>
                  <SeletorRestricaoAlimentar
                    v-model="item.restricao"
                    :nome="item.nome.trim() || TEXTOS_LISTA_ACOMPANHANTES.rotuloItem(indice + 1)"
                    :possui-registro="item.possuiRegistro"
                    :erro="item.erroRestricao"
                    :desabilitado="store.enviando"
                    :id-base="`rsvp-restricao-acompanhante-${indice}`"
                    @update:model-value="item.erroRestricao = null"
                  />
                </template>
              </ListaRepetivel>
            </section>

            <AvisoPrivacidade
              v-if="alguemVai"
              :dias-retencao="dados.privacidade.diasRetencao"
            >
              <CaixaConsentimento
                v-if="informaDadosSensiveis"
                ref="caixaConsentimento"
                v-model="consentimento"
                id-campo="rsvp-consentimento"
                :texto="TEXTOS_DADOS_SENSIVEIS.consentimento"
                :erro="erroConsentimento"
                :desabilitado="store.enviando"
              />
            </AvisoPrivacidade>

            <MensagemFormulario
              v-if="mensagemErro"
              id="rsvp-mensagem-erro"
              :mensagem="mensagemErro"
              data-teste="rsvp-erro"
            />

            <BarraAcaoFixa class="rsvp__barra">
              <template #status>
                <span data-teste="rsvp-contador">{{ statusBarra }}</span>
              </template>
              <Button
                type="submit"
                :label="TEXTOS_RSVP.enviar"
                :loading="store.enviando"
                data-teste="rsvp-enviar"
              />
            </BarraAcaoFixa>
          </form>
        </div>

        <ParaODiaRsvp
          class="rsvp__dia"
          :evento="dados.evento"
          :data-limite-resposta="dados.dataLimiteResposta"
          :mostrar-prazo="modo === 'formulario' && dados.podeResponder"
          :pode-responder="dados.podeResponder"
          :hoje="hoje"
        />
      </div>
    </div>
  </LayoutPublico>
</template>

<style scoped>
.rsvp {
  container: rsvp / inline-size;
  width: 100%;
}

.rsvp__grade {
  display: grid;
  gap: var(--p-ritmo-cartao);
  width: 100%;
  max-width: var(--p-dimensao-largura-convite);
  margin-inline: auto;
}

.rsvp__convite {
  align-items: center;
  text-align: center;
}

.rsvp__nome-convite {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.rsvp__titulo-secao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.layout-publico__folha .rsvp__titulo-secao :deep(.p-button),
.layout-publico__folha .rsvp__pessoas .rsvp__ninguem {
  align-self: flex-start;
  width: auto;
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding-inline: 0;
}

.rsvp__lista-pessoas,
.rsvp__lista-resumo {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rsvp__pessoa + .rsvp__pessoa {
  border-top: 1px solid var(--p-cor-borda-publica);
}

.rsvp__rotulo-opcoes {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.rsvp__alterar {
  text-align: center;
}

.rsvp__lista-resumo {
  padding: 0 var(--p-ritmo-cartao);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda-publica);
  border-radius: var(--p-raio-painel);
}

.rsvp__linha-resumo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-ritmo-grupo);
  padding: var(--p-ritmo-grupo) 0;
  font-size: var(--p-fonte-tamanho-controle);
  overflow-wrap: anywhere;
}

.rsvp__linha-resumo + .rsvp__linha-resumo {
  border-top: 1px solid var(--p-cor-borda-publica);
}

.rsvp__nome-resumo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.rsvp__resposta-resumo {
  flex-shrink: 0;
  color: var(--p-cor-texto-apoio);
}

.rsvp__resposta-resumo--vai {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-primaria);
}

.rsvp__formulario .rsvp__barra {
  margin: 0;
  padding-right: 0;
  padding-left: 0;
  background: var(--p-cor-fundo-convite);
  border-top-color: var(--p-cor-borda-publica);
  box-shadow: none;
}

.rsvp__formulario .rsvp__barra :deep(.p-button) {
  min-height: var(--p-dimensao-altura-acao-convite);
  font-size: var(--p-fonte-tamanho-corpo);
}

@container rsvp (min-width: 56rem) {
  .rsvp__grade {
    grid-template-columns: minmax(0, 1fr) minmax(0, var(--p-dimensao-largura-convite));
    grid-template-rows: auto 1fr;
    align-items: start;
    column-gap: var(--p-ritmo-secao);
    max-width: none;
  }

  .rsvp__coluna-convite {
    grid-column: 1;
    grid-row: 1;
  }

  .rsvp__principal {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .rsvp__dia {
    grid-column: 1;
    grid-row: 2;
  }

  .rsvp__convite {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
