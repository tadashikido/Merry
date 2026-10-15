<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSugestoes from '@/componentes/base/CampoSugestoes.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ListaRepetivel from '@/componentes/base/ListaRepetivel.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import type { TextosListaRepetivel } from '@/componentes/base/tipos'
import { useAlteracoesNaoSalvas, useRastreioAlteracoes } from '@/composables/useAlteracoesNaoSalvas'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useDesfazerExclusao } from '@/composables/useDesfazerExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useConvidadosStore, type FalhaConvidados } from '@/stores/convidados'
import { ROTULOS_FAIXA_ETARIA, ROTULOS_RESPOSTA, TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import {
  FAIXAS_ETARIAS,
  RESPOSTAS_RSVP,
  type ConviteDto,
  type FaixaEtaria,
  type RespostaRsvp,
  type SalvarConviteRequest,
} from '@/tipos/convidados'
import { listarGrupos } from '@/utilitarios/filtroConvidados'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesCasal } from '@/utilitarios/formatacao'
import { formatarTelefone } from '@/utilitarios/telefone'
import { obrigatorio } from '@/utilitarios/validacao'
import {
  LIMITES_CONVIDADOS,
  emailConvidado,
  grupoConvite,
  nomePessoa,
  telefone,
  textoOuNulo,
} from '@/utilitarios/validacaoConvidados'

interface PessoaFormulario {
  chaveLocal: string
  id: string | null
  nome: string
  telefone: string
  email: string
  faixaEtaria: FaixaEtaria
  resposta: RespostaRsvp
}

type CampoPessoa = 'nome' | 'telefone' | 'email' | 'faixaEtaria' | 'resposta'

const props = defineProps<{ id: string; conviteId?: string }>()

const casamentos = useCasamentosStore()
const store = useConvidadosStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()
const { desfazerExclusao } = useDesfazerExclusao()

const edicao = computed(() => Boolean(props.conviteId))
const carregandoConvite = ref(false)
const falhaConvite = ref<FalhaConvidados | null>(null)
const conviteOriginal = ref<ConviteDto | null>(null)
const enviando = ref(false)
const tentouEnviar = ref(false)
const mensagemErro = ref<string | null>(null)
const bloqueadoPorPermissao = ref(false)

const dados = reactive({ nome: '', grupo: '', limiteAcompanhantes: 0 })
const erros = reactive<Record<string, string>>({})
const pessoas = ref<PessoaFormulario[]>([])
let sequencia = 0
const rastreio = useRastreioAlteracoes(() => montarRequest())
const { liberarSaida } = useAlteracoesNaoSalvas(rastreio.temAlteracoes)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const arquivado = computed(() => casamento.value?.arquivado === true)
const titulo = computed(() => (edicao.value ? TEXTOS_CONVIDADOS.editarConviteTitulo : TEXTOS_CONVIDADOS.novoConviteTitulo))
const somenteLeitura = computed(() => arquivado.value || bloqueadoPorPermissao.value)

const sugestoesGrupo = computed(() => {
  const convites = store.casamentoId === props.id ? (store.lista?.convites ?? []) : []
  return listarGrupos(convites).grupos.map((grupo) => grupo.rotulo)
})

const opcoesAcompanhantes = Array.from({ length: LIMITES_CONVIDADOS.acompanhantesMaximo + 1 }, (_, quantidade) => ({
  valor: quantidade,
  rotulo: quantidade === 0 ? TEXTOS_CONVIDADOS.opcaoSemAcompanhante : TEXTOS_CONVIDADOS.opcaoAcompanhantes(quantidade),
}))
const opcoesFaixa = FAIXAS_ETARIAS.map((valor) => ({ valor, rotulo: ROTULOS_FAIXA_ETARIA[valor] }))
const opcoesResposta = RESPOSTAS_RSVP.map((valor) => ({ valor, rotulo: ROTULOS_RESPOSTA[valor] }))

const textosLista: TextosListaRepetivel = {
  rotuloItem: TEXTOS_CONVIDADOS.rotuloPessoaNumero,
  adicionar: TEXTOS_CONVIDADOS.adicionarPessoa,
  remover: TEXTOS_CONVIDADOS.removerPessoa,
  contador: TEXTOS_CONVIDADOS.contadorPessoas,
  limiteAtingido: TEXTOS_CONVIDADOS.limitePessoas,
  minimoAtingido: TEXTOS_CONVIDADOS.minimoPessoas,
  adicionado: TEXTOS_CONVIDADOS.pessoaAdicionada,
  removido: TEXTOS_CONVIDADOS.pessoaRemovida,
}

const REGRAS_PESSOA: Record<CampoPessoa, ((valor: unknown) => string | null)[]> = {
  nome: [obrigatorio, nomePessoa],
  telefone: [telefone],
  email: [emailConvidado],
  faixaEtaria: [],
  resposta: [],
}

function novaPessoa(dadosPessoa: Partial<PessoaFormulario> = {}): PessoaFormulario {
  sequencia += 1
  return {
    chaveLocal: `pessoa-${sequencia}`,
    id: null,
    nome: '',
    telefone: '',
    email: '',
    faixaEtaria: 'Adulto',
    resposta: 'Pendente',
    ...dadosPessoa,
  }
}

function idCampoConvite(campo: string): string {
  return `convite-${campo}`
}

function idCampoPessoa(indice: number, campo: CampoPessoa): string {
  return `convite-pessoa-${indice}-${campo}`
}

function chaveErroPessoa(indice: number, campo: CampoPessoa): string {
  return `convidados[${indice}].${campo}`
}

function limparErros() {
  for (const chave of Object.keys(erros)) {
    delete erros[chave]
  }
}

function definirErro(chave: string, mensagem: string | null) {
  if (mensagem) {
    erros[chave] = mensagem
  } else {
    delete erros[chave]
  }
}

function validarCampoConvite(campo: 'nome' | 'grupo'): boolean {
  const regra = campo === 'nome' ? nomePessoa : grupoConvite
  const mensagem = regra(dados[campo])
  definirErro(campo, mensagem)
  return mensagem === null
}

function validarCampoPessoa(indice: number, campo: CampoPessoa): boolean {
  const pessoa = pessoas.value[indice]
  if (!pessoa) {
    return true
  }
  const mensagem = REGRAS_PESSOA[campo].map((regra) => regra(pessoa[campo])).find((resultado) => resultado !== null) ?? null
  definirErro(chaveErroPessoa(indice, campo), mensagem)
  return mensagem === null
}

function validarConviteAoSair(campo: 'nome' | 'grupo'): boolean {
  return tentouEnviar.value ? validarCampoConvite(campo) : true
}

function revalidarConviteAoDigitar(campo: 'nome' | 'grupo'): boolean {
  return tentouEnviar.value && erros[campo] ? validarCampoConvite(campo) : true
}

function validarPessoaAoSair(indice: number, campo: CampoPessoa): boolean {
  return tentouEnviar.value ? validarCampoPessoa(indice, campo) : true
}

function revalidarPessoaAoDigitar(indice: number, campo: CampoPessoa): boolean {
  return tentouEnviar.value && erros[chaveErroPessoa(indice, campo)] ? validarCampoPessoa(indice, campo) : true
}

function validar(): string | null {
  tentouEnviar.value = true
  limparErros()
  const invalidos: string[] = []
  if (!validarCampoConvite('nome')) {
    invalidos.push(idCampoConvite('nome'))
  }
  if (!validarCampoConvite('grupo')) {
    invalidos.push(idCampoConvite('grupo'))
  }
  pessoas.value.forEach((_, indice) => {
    for (const campo of ['nome', 'telefone', 'email'] as const) {
      if (!validarCampoPessoa(indice, campo)) {
        invalidos.push(idCampoPessoa(indice, campo))
      }
    }
  })
  return invalidos[0] ?? null
}

function preencher(convite: ConviteDto) {
  dados.nome = convite.nome
  dados.grupo = convite.grupo ?? ''
  dados.limiteAcompanhantes = convite.limiteAcompanhantes
  pessoas.value = convite.convidados.map((convidado) =>
    novaPessoa({
      id: convidado.id,
      nome: convidado.nome,
      telefone: formatarTelefone(convidado.telefone),
      email: convidado.email ?? '',
      faixaEtaria: convidado.faixaEtaria,
      resposta: convidado.resposta,
    }),
  )
  rastreio.fixarEstadoInicial()
}

async function carregarConvite() {
  if (!props.conviteId) {
    return
  }
  carregandoConvite.value = true
  falhaConvite.value = null
  const resultado = await store.obter(props.id, props.conviteId)
  carregandoConvite.value = false
  if (resultado.ok) {
    conviteOriginal.value = resultado.valor
    preencher(resultado.valor)
    return
  }
  falhaConvite.value = resultado.falha
}

onMounted(async () => {
  pessoas.value = [novaPessoa()]
  rastreio.fixarEstadoInicial()
  if (casamentos.atual?.id !== props.id) {
    void casamentos.obter(props.id)
  }
  if (store.casamentoId !== props.id || !store.lista) {
    void store.carregar(props.id)
  }
  await carregarConvite()
  if (!falhaConvite.value) {
    await focarElemento(idCampoConvite('nome'))
  }
})

function adicionarPessoa() {
  pessoas.value.push(novaPessoa())
}

function reindexarErrosPessoas(indiceRemovido: number) {
  const padrao = /^convidados\[(\d+)\]\.(.+)$/
  const reindexados: Record<string, string> = {}
  for (const [chave, mensagem] of Object.entries(erros)) {
    const correspondencia = padrao.exec(chave)
    if (!correspondencia) {
      continue
    }
    delete erros[chave]
    const indice = Number(correspondencia[1])
    if (indice === indiceRemovido) {
      continue
    }
    const novoIndice = indice > indiceRemovido ? indice - 1 : indice
    reindexados[`convidados[${novoIndice}].${correspondencia[2]}`] = mensagem
  }
  Object.assign(erros, reindexados)
}

function removerPessoa(indice: number) {
  pessoas.value.splice(indice, 1)
  reindexarErrosPessoas(indice)
}

function montarRequest(): SalvarConviteRequest {
  return {
    nome: textoOuNulo(dados.nome),
    grupo: textoOuNulo(dados.grupo),
    limiteAcompanhantes: dados.limiteAcompanhantes,
    convidados: pessoas.value.map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.nome.replace(/\s+/g, ' ').trim(),
      telefone: textoOuNulo(pessoa.telefone),
      email: textoOuNulo(pessoa.email),
      faixaEtaria: pessoa.faixaEtaria,
      resposta: pessoa.resposta,
    })),
  }
}

function voltarParaLista() {
  liberarSaida()
  void roteador.push({ name: 'casamento-convidados', params: { id: props.id } })
}

function idDoErroApi(chave: string): string | null {
  const pessoa = /^convidados\[(\d+)\]\.(nome|telefone|email|faixaEtaria|resposta)$/.exec(chave)
  if (pessoa) {
    return idCampoPessoa(Number(pessoa[1]), pessoa[2] as CampoPessoa)
  }
  if (chave === 'nome' || chave === 'grupo' || chave === 'limiteAcompanhantes') {
    return idCampoConvite(chave)
  }
  return null
}

async function tratarFalha(falha: FalhaConvidados) {
  let primeiroId: string | null = null
  for (const [chave, mensagem] of Object.entries(falha.errosCampos)) {
    const idCampo = idDoErroApi(chave)
    if (idCampo) {
      erros[chave] = mensagem
      primeiroId ??= idCampo
    } else if (chave === 'convidados') {
      mensagemErro.value = mensagem
    }
  }
  if (primeiroId) {
    await focarElemento(primeiroId)
    return
  }
  if (mensagemErro.value) {
    return
  }
  if (falha.tipo === 'semPermissao') {
    bloqueadoPorPermissao.value = true
    mensagemErro.value = TEXTOS_CONVIDADOS.semPermissao
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_CONVIDADOS.conviteNaoEncontradoTitulo
    return
  }
  notificacao.erro(falha.tipo === 'conexao' && falha.mensagem ? falha.mensagem : undefined)
}

async function enviar() {
  mensagemErro.value = null
  const primeiroInvalido = validar()
  if (primeiroInvalido) {
    await focarElemento(primeiroInvalido)
    return
  }

  enviando.value = true
  const request = montarRequest()
  const resultado = props.conviteId
    ? await store.atualizar(props.id, props.conviteId, request)
    : await store.criar(props.id, request)
  enviando.value = false

  if (resultado.ok) {
    liberarSaida()
    notificacao.sucesso(TEXTOS_CONVIDADOS.salvo(resultado.valor.nome))
    await roteador.replace({ name: 'casamento-convidados', params: { id: props.id } })
    return
  }
  await tratarFalha(resultado.falha)
}

function excluir() {
  const convite = conviteOriginal.value
  if (!convite) {
    return
  }
  const casamentoId = props.id
  confirmarExclusao({
    nomeItem: convite.nome,
    mensagem: TEXTOS_CONVIDADOS.confirmarExclusaoTexto(convite.convidados.length),
    aoConfirmar: async () => {
      store.removerComDesfazer(casamentoId, convite.id, (falha) => {
        notificacao.erro(falha.tipo === 'semPermissao' ? TEXTOS_CONVIDADOS.semPermissao : TEXTOS_CONVIDADOS.erroExcluir(convite.nome))
      })
      liberarSaida()
      await roteador.replace({ name: 'casamento-convidados', params: { id: casamentoId } })
    },
    desfazer: () =>
      desfazerExclusao(() => store.desfazerRemocao(casamentoId, convite.id), TEXTOS_CONVIDADOS.restaurado(convite.nome)),
    aoFecharAviso: () => store.concluirRemocao(casamentoId, convite.id),
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="pagina-formulario">
      <CabecalhoPagina
        :titulo="titulo"
        :descricao="nomes || undefined"
      />

      <div class="pilha pilha--cartao">
        <EstadoCarregando
          v-if="carregandoConvite"
          variante="formulario"
          :linhas="4"
        />

        <template v-else-if="falhaConvite">
          <EstadoErro
            v-if="falhaConvite.tipo === 'naoEncontrado'"
            :titulo="TEXTOS_CONVIDADOS.conviteNaoEncontradoTitulo"
            :mensagem="TEXTOS_CONVIDADOS.conviteNaoEncontradoTexto"
            :pode-tentar-novamente="false"
          />
          <EstadoErro
            v-else
            :titulo="TEXTOS_CONVIDADOS.erroCarregarTitulo"
            :mensagem="falhaConvite.tipo === 'semPermissao' ? TEXTOS_CONVIDADOS.semAcesso : TEXTOS_CONVIDADOS.erroCarregar"
            :pode-tentar-novamente="falhaConvite.tipo !== 'semPermissao'"
            @tentar-novamente="carregarConvite"
          />
          <RouterLink
            class="formulario-convite__voltar"
            :to="{ name: 'casamento-convidados', params: { id } }"
            data-teste="voltar-convidados"
          >
            {{ TEXTOS_CONVIDADOS.voltarConvidados }}
          </RouterLink>
        </template>

        <template v-else>
          <MensagemFormulario
            v-if="arquivado"
            variante="informacao"
            :mensagem="TEXTOS_CONVIDADOS.avisoArquivado"
            data-teste="aviso-arquivado"
          />
          <MensagemFormulario
            v-if="mensagemErro"
            :mensagem="mensagemErro"
            data-teste="erro-formulario"
          />

          <form
            class="formulario-convite pilha pilha--bloco"
            novalidate
            data-teste="formulario-convite"
            @submit.prevent="enviar"
          >
            <fieldset class="formulario-convite__grupo pilha pilha--grupo">
              <legend class="formulario-convite__legenda texto-rotulo">
                {{ TEXTOS_CONVIDADOS.grupoConvite }}
              </legend>
              <CampoFormulario
                v-slot="{ id: idEntrada, invalido, descritoPor }"
                :rotulo="TEXTOS_CONVIDADOS.campoNomeConvite"
                :id-campo="idCampoConvite('nome')"
                :dica="TEXTOS_CONVIDADOS.dicaNomeConvite"
                :erro="erros.nome"
              >
                <InputText
                  :id="idEntrada"
                  v-model="dados.nome"
                  autocomplete="off"
                  :maxlength="LIMITES_CONVIDADOS.nomeMaximo"
                  :invalid="invalido"
                  :aria-invalid="invalido"
                  :aria-describedby="descritoPor"
                  :readonly="enviando || somenteLeitura"
                  data-teste="campo-nome-convite"
                  @update:model-value="revalidarConviteAoDigitar('nome')"
                  @blur="validarConviteAoSair('nome')"
                />
              </CampoFormulario>
              <div class="formulario-convite__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CONVIDADOS.campoGrupo"
                  :id-campo="idCampoConvite('grupo')"
                  :dica="TEXTOS_CONVIDADOS.dicaGrupo"
                  :erro="erros.grupo"
                >
                  <CampoSugestoes
                    :id="idEntrada"
                    v-model="dados.grupo"
                    :sugestoes="sugestoesGrupo"
                    :invalido="invalido"
                    :descrito-por="descritoPor"
                    :maximo="LIMITES_CONVIDADOS.grupoMaximo"
                    :rotulo-botao-sugestoes="TEXTOS_CONVIDADOS.mostrarGrupos"
                    :desabilitado="enviando || somenteLeitura"
                    @update:model-value="revalidarConviteAoDigitar('grupo')"
                    @blur="validarConviteAoSair('grupo')"
                  />
                </CampoFormulario>
                <CampoFormulario
                  v-slot="{ id: idEntrada, descritoPor }"
                  :rotulo="TEXTOS_CONVIDADOS.campoAcompanhantes"
                  :id-campo="idCampoConvite('limiteAcompanhantes')"
                  :dica="TEXTOS_CONVIDADOS.dicaAcompanhantes"
                  :erro="erros.limiteAcompanhantes"
                >
                  <Select
                    v-model="dados.limiteAcompanhantes"
                    :input-id="idEntrada"
                    :options="opcoesAcompanhantes"
                    option-label="rotulo"
                    option-value="valor"
                    :aria-describedby="descritoPor"
                    :disabled="enviando || somenteLeitura"
                    data-teste="campo-acompanhantes"
                  />
                </CampoFormulario>
              </div>
            </fieldset>

            <section
              class="formulario-convite__grupo pilha pilha--grupo"
              aria-labelledby="titulo-pessoas"
            >
              <h2
                id="titulo-pessoas"
                class="formulario-convite__titulo-secao texto-rotulo"
              >
                {{ TEXTOS_CONVIDADOS.secaoPessoas }}
              </h2>
              <ListaRepetivel
                :itens="pessoas"
                :chave="(pessoa) => pessoa.chaveLocal"
                :textos="textosLista"
                :minimo="LIMITES_CONVIDADOS.pessoasMinimo"
                :maximo="LIMITES_CONVIDADOS.pessoasMaximo"
                :desabilitado="enviando || somenteLeitura"
                @adicionar="adicionarPessoa"
                @remover="removerPessoa"
              >
                <template #default="{ item: pessoa, indice }">
                  <div
                    class="formulario-convite__pessoa pilha pilha--grupo"
                    data-teste="dados-pessoa"
                  >
                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_CONVIDADOS.campoNome"
                      :id-campo="idCampoPessoa(indice, 'nome')"
                      obrigatorio
                      :erro="erros[chaveErroPessoa(indice, 'nome')]"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="pessoa.nome"
                        autocomplete="off"
                        :maxlength="LIMITES_CONVIDADOS.nomeMaximo"
                        aria-required="true"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando || somenteLeitura"
                        data-teste="campo-nome-pessoa"
                        @update:model-value="revalidarPessoaAoDigitar(indice, 'nome')"
                        @blur="validarPessoaAoSair(indice, 'nome')"
                      />
                    </CampoFormulario>
                    <div class="formulario-convite__colunas-pessoa formulario-convite__colunas-pessoa--opcoes">
                      <div
                        class="formulario-convite__opcoes"
                        role="group"
                        :aria-labelledby="`${idCampoPessoa(indice, 'faixaEtaria')}-rotulo`"
                      >
                        <span
                          :id="`${idCampoPessoa(indice, 'faixaEtaria')}-rotulo`"
                          class="formulario-convite__rotulo-opcoes"
                        >{{ TEXTOS_CONVIDADOS.campoIdade }}</span>
                        <SelectButton
                          :id="idCampoPessoa(indice, 'faixaEtaria')"
                          v-model="pessoa.faixaEtaria"
                          :options="opcoesFaixa"
                          option-label="rotulo"
                          option-value="valor"
                          :allow-empty="false"
                          :aria-labelledby="`${idCampoPessoa(indice, 'faixaEtaria')}-rotulo`"
                          :disabled="enviando || somenteLeitura"
                          data-teste="campo-faixa-etaria"
                        />
                      </div>
                      <div
                        class="formulario-convite__opcoes"
                        role="group"
                        :aria-labelledby="`${idCampoPessoa(indice, 'resposta')}-rotulo`"
                      >
                        <span
                          :id="`${idCampoPessoa(indice, 'resposta')}-rotulo`"
                          class="formulario-convite__rotulo-opcoes"
                        >{{ TEXTOS_CONVIDADOS.campoResposta }}</span>
                        <SelectButton
                          :id="idCampoPessoa(indice, 'resposta')"
                          v-model="pessoa.resposta"
                          :options="opcoesResposta"
                          option-label="rotulo"
                          option-value="valor"
                          :allow-empty="false"
                          :aria-labelledby="`${idCampoPessoa(indice, 'resposta')}-rotulo`"
                          :disabled="enviando || somenteLeitura"
                          data-teste="campo-resposta"
                        />
                      </div>
                    </div>
                    <div class="formulario-convite__colunas-pessoa">
                      <CampoFormulario
                        v-slot="{ id: idEntrada, invalido, descritoPor }"
                        :rotulo="TEXTOS_CONVIDADOS.campoTelefone"
                        :id-campo="idCampoPessoa(indice, 'telefone')"
                        :erro="erros[chaveErroPessoa(indice, 'telefone')]"
                      >
                        <InputText
                          :id="idEntrada"
                          v-model="pessoa.telefone"
                          type="tel"
                          inputmode="tel"
                          autocomplete="off"
                          :maxlength="LIMITES_CONVIDADOS.telefoneMaximo"
                          :invalid="invalido"
                          :aria-invalid="invalido"
                          :aria-describedby="descritoPor"
                          :readonly="enviando || somenteLeitura"
                          data-teste="campo-telefone"
                          @update:model-value="revalidarPessoaAoDigitar(indice, 'telefone')"
                          @blur="validarPessoaAoSair(indice, 'telefone')"
                        />
                      </CampoFormulario>
                      <CampoFormulario
                        v-slot="{ id: idEntrada, invalido, descritoPor }"
                        :rotulo="TEXTOS_CONVIDADOS.campoEmail"
                        :id-campo="idCampoPessoa(indice, 'email')"
                        :erro="erros[chaveErroPessoa(indice, 'email')]"
                      >
                        <InputText
                          :id="idEntrada"
                          v-model="pessoa.email"
                          type="email"
                          inputmode="email"
                          autocomplete="off"
                          :maxlength="LIMITES_CONVIDADOS.emailMaximo"
                          :invalid="invalido"
                          :aria-invalid="invalido"
                          :aria-describedby="descritoPor"
                          :readonly="enviando || somenteLeitura"
                          data-teste="campo-email"
                          @update:model-value="revalidarPessoaAoDigitar(indice, 'email')"
                          @blur="validarPessoaAoSair(indice, 'email')"
                        />
                      </CampoFormulario>
                    </div>
                  </div>
                </template>
              </ListaRepetivel>
            </section>

            <div class="formulario-convite__acoes">
              <div class="formulario-convite__acoes-principais">
                <Button
                  type="submit"
                  :label="TEXTOS_CONVIDADOS.salvarConvite"
                  :loading="enviando"
                  :aria-busy="enviando"
                  :disabled="somenteLeitura"
                  data-teste="salvar-convite"
                />
                <Button
                  type="button"
                  :label="ROTULOS_ACOES.cancelar"
                  severity="secondary"
                  text
                  :disabled="enviando"
                  data-teste="cancelar"
                  @click="voltarParaLista"
                />
              </div>
              <Button
                v-if="edicao && conviteOriginal && !somenteLeitura"
                type="button"
                :label="TEXTOS_CONVIDADOS.excluirConvite"
                icon="ie ie-excluir"
                severity="danger"
                outlined
                :disabled="enviando"
                data-teste="excluir-convite"
                @click="excluir"
              />
            </div>
          </form>
        </template>
      </div>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-convite {
  container: formulario-convite / inline-size;
}

.formulario-convite__grupo {
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-convite__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-convite__titulo-secao {
  margin: 0;
}

.formulario-convite__pessoa {
  container: pessoa-convite / inline-size;
}

.formulario-convite__colunas,
.formulario-convite__colunas-pessoa {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
}

.formulario-convite__opcoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.formulario-convite__rotulo-opcoes {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.formulario-convite__opcoes :deep(.p-selectbutton) {
  display: flex;
  flex-wrap: wrap;
}

.formulario-convite__opcoes :deep(.p-togglebutton) {
  min-height: var(--p-dimensao-alvo-toque);
}

.formulario-convite__acoes,
.formulario-convite__acoes-principais {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-convite__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.formulario-convite__voltar {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: var(--p-dimensao-alvo-toque);
}

@container formulario-convite (min-width: 32rem) {
  .formulario-convite__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-convite__acoes {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--p-ritmo-grupo);
  }

  .formulario-convite__acoes-principais {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}

@container pessoa-convite (min-width: 28rem) {
  .formulario-convite__colunas-pessoa {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-convite__colunas-pessoa--opcoes {
    grid-template-columns: minmax(0, 1fr);
  }
}

@container pessoa-convite (min-width: 42rem) {
  .formulario-convite__colunas-pessoa--opcoes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container pessoa-convite (max-width: 27.99rem) {
  .formulario-convite__opcoes :deep(.p-selectbutton) {
    width: 100%;
  }

  .formulario-convite__opcoes :deep(.p-togglebutton) {
    flex: 1 1 auto;
  }

  .formulario-convite__opcoes :deep(.p-togglebutton-content) {
    justify-content: center;
    padding-inline: var(--p-ritmo-campo);
  }
}
</style>
