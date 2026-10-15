<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoPrimeiroAcesso from '@/componentes/base/EstadoPrimeiroAcesso.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import LinhaHoje from '@/componentes/base/LinhaHoje.vue'
import LinhaParcela from '@/componentes/base/LinhaParcela.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ResumoOrcamento from '@/componentes/base/ResumoOrcamento.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import DialogoGerarParcelas from '@/componentes/financeiro/DialogoGerarParcelas.vue'
import DialogoPagamento from '@/componentes/financeiro/DialogoPagamento.vue'
import DialogoParcela from '@/componentes/financeiro/DialogoParcela.vue'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_COMPROVANTE, TEXTOS_FINANCEIRO, TEXTOS_PARCELA } from '@/textos/financeiro'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import type { FornecedorFinanceiroDto, ParcelaDto, ResultadoPagamento } from '@/tipos/financeiro'
import { verificarArquivoComprovante, ACEITE_COMPROVANTE, formatarTamanhoArquivo } from '@/utilitarios/arquivo'
import { deCentavos, paraCentavos, somarCentavos } from '@/utilitarios/centavos'
import { agruparLivro } from '@/utilitarios/financeiro'
import { formatarDataCalendarioComDiaSemana, formatarDataCalendarioCurta, formatarMoeda, formatarNomesCasal } from '@/utilitarios/formatacao'

type Visao = 'vencimento' | 'fornecedor'
type AcaoParcela = 'pagar' | 'editar' | 'remover' | 'anexar' | 'baixar' | 'substituir' | 'removerComprovante' | 'desfazer'
type Confirmacao = { tipo: 'remover' | 'desfazer' | 'removerComprovante'; parcela: ParcelaDto; nomeEmpresa: string }

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const store = useFinanceiroStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()

const visao = ref<Visao>(rota.query.visao === 'fornecedor' ? 'fornecedor' : 'vencimento')
const pagasAbertas = ref(false)
const dialogoParcela = ref<{ vinculoId: string | null; parcela: ParcelaDto | null } | null>(null)
const fornecedorGerador = ref<FornecedorFinanceiroDto | null>(null)
const parcelaPagamento = ref<{ parcela: ParcelaDto; nomeEmpresa: string } | null>(null)
const confirmacao = ref<Confirmacao | null>(null)
const executandoConfirmacao = ref(false)
const parcelaEmAndamento = ref<string | null>(null)
const entradaArquivo = ref<HTMLInputElement | null>(null)
const parcelaComprovante = ref<{ parcela: ParcelaDto; nomeEmpresa: string } | null>(null)

const opcoesVisao = [
  { valor: 'vencimento', rotulo: TEXTOS_FINANCEIRO.segmentoVencimento },
  { valor: 'fornecedor', rotulo: TEXTOS_FINANCEIRO.segmentoFornecedor },
]

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const financeiro = computed(() => (store.casamentoId === props.id ? store.financeiro : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const visaoDoCasal = computed(() => autenticacao.ehCasal)
const arquivado = computed(() => financeiro.value?.casamentoArquivado ?? casamento.value?.arquivado ?? false)
const podeGerenciar = computed(() => !visaoDoCasal.value && financeiro.value?.somenteLeitura === false)
const fornecedores = computed(() => financeiro.value?.fornecedores ?? [])
const contratados = computed(() => fornecedores.value.filter((fornecedor) => fornecedor.status === 'Contratado'))
const cancelados = computed(() => fornecedores.value.filter((fornecedor) => fornecedor.status === 'Cancelado'))
const semFornecedores = computed(() => financeiro.value !== null && fornecedores.value.length === 0)
const livro = computed(() => agruparLivro(fornecedores.value))
const semParcelas = computed(
  () =>
    livro.value.vencidas.length + livro.value.proximas.length + livro.value.depois.length + livro.value.pagas.length === 0,
)
const totalPagasCentavos = computed(() => somarCentavos(livro.value.pagas.map((parcela) => parcela.valor)))
const faixaAlertas = computed(() => {
  const alertas = financeiro.value?.alertas
  if (!alertas || (alertas.totalVencidas === 0 && alertas.totalProximas === 0)) {
    return null
  }
  return {
    variante: alertas.totalVencidas > 0 ? ('erro' as const) : ('alerta' as const),
    texto: TEXTOS_FINANCEIRO.faixaAlertas(alertas.totalVencidas, formatarMoeda(alertas.valorVencidas), alertas.totalProximas),
  }
})
const indicadores = computed(() => {
  const atual = financeiro.value
  if (!atual) {
    return []
  }
  const vencido = atual.resumo.totalVencido ?? 0
  const temVencido = paraCentavos(vencido) > 0
  const aParcelar = deCentavos(somarCentavos(contratados.value.map((fornecedor) => Math.max(fornecedor.saldoAParcelar, 0))))
  return [
    { chave: 'pago', rotulo: TEXTOS_FINANCEIRO.indicadorPago, valor: formatarMoeda(atual.resumo.totalPago ?? 0), apoio: TEXTOS_FINANCEIRO.apoioPago, alerta: false },
    { chave: 'a-pagar', rotulo: TEXTOS_FINANCEIRO.indicadorAPagar, valor: formatarMoeda(atual.resumo.totalPendente ?? 0), apoio: TEXTOS_FINANCEIRO.apoioAPagar, alerta: false },
    {
      chave: 'vencido',
      rotulo: TEXTOS_FINANCEIRO.indicadorVencido,
      valor: formatarMoeda(vencido),
      apoio: temVencido ? TEXTOS_FINANCEIRO.apoioVencidas(atual.alertas.totalVencidas) : TEXTOS_FINANCEIRO.apoioEmDia,
      alerta: temVencido,
    },
    { chave: 'a-parcelar', rotulo: TEXTOS_FINANCEIRO.indicadorAParcelar, valor: formatarMoeda(aParcelar), apoio: TEXTOS_FINANCEIRO.apoioAParcelar, alerta: false },
  ]
})
const descricao = computed(() =>
  casamento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(casamento.value.data)}` : undefined,
)

watch(
  () => props.id,
  (id) => {
    void casamentos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_FINANCEIRO.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

watch(
  () => financeiro.value !== null && semParcelas.value && podeGerenciar.value,
  (irParaFornecedor) => {
    if (irParaFornecedor) {
      visao.value = 'fornecedor'
    }
  },
  { immediate: true },
)

function nomeEmpresaDe(vinculoId: string): string {
  return fornecedores.value.find((fornecedor) => fornecedor.fornecedorCasamentoId === vinculoId)?.nomeEmpresa ?? ''
}

function pagoDe(fornecedor: FornecedorFinanceiroDto): string {
  return TEXTOS_FINANCEIRO.fornecedorPagoDe(formatarMoeda(fornecedor.pago), formatarMoeda(fornecedor.valorContratado))
}

function saldo(fornecedor: FornecedorFinanceiroDto): string | null {
  return paraCentavos(fornecedor.saldoAParcelar) > 0 ? TEXTOS_FINANCEIRO.avisoSaldo(formatarMoeda(fornecedor.saldoAParcelar)) : null
}

function acoesDaParcela(parcela: ParcelaDto): ItemMenuAcoes[] {
  if (parcela.situacao !== 'Paga') {
    return [
      { chave: 'pagar', rotulo: TEXTOS_PARCELA.menuMarcarPaga, icone: 'ie ie-concluir' },
      { chave: 'editar', rotulo: TEXTOS_PARCELA.menuEditar, icone: 'ie ie-editar' },
      { chave: 'remover', rotulo: TEXTOS_PARCELA.menuRemover, icone: 'ie ie-excluir', perigoso: true },
    ]
  }
  const itens: ItemMenuAcoes[] = parcela.comprovante
    ? [
        { chave: 'baixar', rotulo: TEXTOS_PARCELA.menuBaixar, icone: 'ie ie-exportar' },
        { chave: 'substituir', rotulo: TEXTOS_PARCELA.menuSubstituir, icone: 'ie ie-importar' },
        { chave: 'removerComprovante', rotulo: TEXTOS_PARCELA.menuRemoverComprovante, icone: 'ie ie-excluir', perigoso: true },
      ]
    : [{ chave: 'anexar', rotulo: TEXTOS_PARCELA.menuAnexar, icone: 'ie ie-importar' }]
  itens.push({ chave: 'desfazer', rotulo: TEXTOS_PARCELA.menuDesfazer, icone: 'ie ie-restaurar' })
  return itens
}

function executarAcao(parcela: ParcelaDto, nomeEmpresa: string, chave: string) {
  switch (chave as AcaoParcela) {
    case 'pagar':
      parcelaPagamento.value = { parcela, nomeEmpresa }
      return
    case 'editar':
      dialogoParcela.value = { vinculoId: parcela.fornecedorCasamentoId, parcela }
      return
    case 'remover':
      confirmacao.value = { tipo: 'remover', parcela, nomeEmpresa }
      return
    case 'anexar':
    case 'substituir':
      parcelaComprovante.value = { parcela, nomeEmpresa }
      entradaArquivo.value?.click()
      return
    case 'baixar':
      void baixar(parcela)
      return
    case 'removerComprovante':
      confirmacao.value = { tipo: 'removerComprovante', parcela, nomeEmpresa }
      return
    case 'desfazer':
      if (parcela.comprovante) {
        confirmacao.value = { tipo: 'desfazer', parcela, nomeEmpresa }
        return
      }
      void desfazer(parcela)
  }
}

function mensagemFalha(mensagem: string | null, tipo: string, padrao: string): string {
  if (tipo === 'conflito') {
    return TEXTOS_PARCELA.erroConcorrencia
  }
  return tipo === 'regra' && mensagem ? mensagem : padrao
}

async function desfazer(parcela: ParcelaDto): Promise<boolean> {
  parcelaEmAndamento.value = parcela.id
  const resultado = await store.desfazerPagamento(props.id, parcela.fornecedorCasamentoId, parcela.id)
  parcelaEmAndamento.value = null
  if (!resultado.ok) {
    notificacao.erro(mensagemFalha(resultado.falha.mensagem, resultado.falha.tipo, TEXTOS_PARCELA.erroDesfazer))
    return false
  }
  notificacao.sucesso(TEXTOS_PARCELA.sucessoDesfeito)
  return true
}

async function baixar(parcela: ParcelaDto) {
  parcelaEmAndamento.value = parcela.id
  const resultado = await store.baixarComprovante(props.id, parcela)
  parcelaEmAndamento.value = null
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_COMPROVANTE.erroBaixar)
  }
}

async function aoEscolherArquivo(evento: Event) {
  const entrada = evento.target as HTMLInputElement
  const arquivo = entrada.files?.[0] ?? null
  entrada.value = ''
  const alvo = parcelaComprovante.value
  parcelaComprovante.value = null
  if (!arquivo || !alvo) {
    return
  }
  const problema = await verificarArquivoComprovante(arquivo)
  if (problema) {
    notificacao.erro(
      problema === 'vazio' ? TEXTOS_COMPROVANTE.erroVazio : problema === 'tamanho' ? TEXTOS_COMPROVANTE.erroTamanho : TEXTOS_COMPROVANTE.erroFormato,
    )
    return
  }
  parcelaEmAndamento.value = alvo.parcela.id
  const resultado = await store.enviarComprovante(props.id, alvo.parcela.fornecedorCasamentoId, alvo.parcela.id, arquivo)
  parcelaEmAndamento.value = null
  if (!resultado.ok) {
    notificacao.erro(mensagemFalha(resultado.falha.mensagem, resultado.falha.tipo, TEXTOS_COMPROVANTE.erroEnviar))
    return
  }
  notificacao.sucesso(TEXTOS_COMPROVANTE.sucessoAnexado)
}

const tituloConfirmacao = computed(() => {
  const atual = confirmacao.value
  if (!atual) {
    return ''
  }
  const { numero, totalParcelas } = atual.parcela
  if (atual.tipo === 'remover') {
    return TEXTOS_PARCELA.confirmarRemoverTitulo(numero, totalParcelas, atual.nomeEmpresa)
  }
  if (atual.tipo === 'desfazer') {
    return TEXTOS_PARCELA.confirmarDesfazerTitulo(numero, totalParcelas, atual.nomeEmpresa)
  }
  return TEXTOS_COMPROVANTE.confirmarRemoverTitulo(numero, totalParcelas, atual.nomeEmpresa)
})

const mensagemConfirmacao = computed(() => {
  const atual = confirmacao.value
  if (!atual) {
    return ''
  }
  if (atual.tipo === 'remover') {
    return TEXTOS_PARCELA.confirmarRemoverTexto(formatarMoeda(atual.parcela.valor), formatarDataCalendarioCurta(atual.parcela.vencimento))
  }
  return atual.tipo === 'desfazer' ? TEXTOS_PARCELA.confirmarDesfazerTexto : TEXTOS_COMPROVANTE.confirmarRemoverTexto
})

const rotuloConfirmacao = computed(() => {
  const tipo = confirmacao.value?.tipo
  if (tipo === 'remover') {
    return TEXTOS_PARCELA.confirmarRemover
  }
  return tipo === 'desfazer' ? TEXTOS_PARCELA.confirmarDesfazer : TEXTOS_COMPROVANTE.confirmarRemover
})

function alterarVisibilidadeConfirmacao(visivel: boolean) {
  if (!visivel && !executandoConfirmacao.value) {
    confirmacao.value = null
  }
}

async function confirmar() {
  const atual = confirmacao.value
  if (!atual) {
    return
  }
  executandoConfirmacao.value = true
  const { parcela } = atual
  if (atual.tipo === 'desfazer') {
    await desfazer(parcela)
  } else if (atual.tipo === 'remover') {
    const resultado = await store.removerParcela(props.id, parcela.fornecedorCasamentoId, parcela.id)
    if (resultado.ok) {
      notificacao.sucesso(TEXTOS_PARCELA.sucessoRemovida)
    } else {
      notificacao.erro(mensagemFalha(resultado.falha.mensagem, resultado.falha.tipo, TEXTOS_PARCELA.erroRemover))
    }
  } else {
    const resultado = await store.removerComprovante(props.id, parcela.fornecedorCasamentoId, parcela.id)
    if (resultado.ok) {
      notificacao.sucesso(TEXTOS_COMPROVANTE.sucessoRemovido)
    } else {
      notificacao.erro(mensagemFalha(resultado.falha.mensagem, resultado.falha.tipo, TEXTOS_COMPROVANTE.erroRemover))
    }
  }
  executandoConfirmacao.value = false
  confirmacao.value = null
}

function aoPagar(resultado: ResultadoPagamento) {
  const { parcela } = resultado
  notificacao.sucesso(TEXTOS_PARCELA.sucessoPaga(parcela.numero, parcela.totalParcelas, nomeEmpresaDe(parcela.fornecedorCasamentoId)), {
    desfazer: async () => {
      await desfazer(parcela)
    },
  })
  if (resultado.comprovanteFalhou) {
    notificacao.erro(TEXTOS_COMPROVANTE.pagaSemComprovante)
  }
}

function aoSalvar(mensagem: string) {
  notificacao.sucesso(mensagem)
}

function adicionarParcela(vinculoId: string | null) {
  dialogoParcela.value = { vinculoId, parcela: null }
}

function fecharDialogoParcela(visivel: boolean) {
  if (!visivel) {
    dialogoParcela.value = null
  }
}

function fecharGerador(visivel: boolean) {
  if (!visivel) {
    fornecedorGerador.value = null
  }
}

function fecharPagamento(visivel: boolean) {
  if (!visivel) {
    parcelaPagamento.value = null
  }
}

function irParaFornecedores() {
  void roteador.push({ name: 'casamento-fornecedores', params: { id: props.id } })
}

function baixarAria(parcela: ParcelaDto, nomeEmpresa: string): string {
  return TEXTOS_PARCELA.baixarComprovanteAria(
    parcela.numero,
    parcela.totalParcelas,
    nomeEmpresa,
    parcela.comprovante ? formatarTamanhoArquivo(parcela.comprovante.tamanhoBytes) : '',
  )
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_FINANCEIRO.naoEncontradoTitulo"
        :mensagem="TEXTOS_FINANCEIRO.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="financeiro__voltar"
        :to="autenticacao.casamentoDoCasal ? { name: 'casamento', params: { id: autenticacao.casamentoDoCasal } } : { name: 'casamentos' }"
        data-teste="voltar"
      >
        {{ autenticacao.casamentoDoCasal ? TEXTOS_FINANCEIRO.voltarNossoCasamento : TEXTOS_FINANCEIRO.voltarCasamentos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_FINANCEIRO.titulo"
        :descricao="descricao"
      >
        <template
          v-if="podeGerenciar && contratados.length > 0"
          #acoes
        >
          <Button
            :label="TEXTOS_FINANCEIRO.adicionarParcela"
            icon="ie ie-mais"
            data-teste="adicionar-parcela"
            @click="adicionarParcela(null)"
          />
        </template>
      </CabecalhoPagina>

      <div class="financeiro pilha pilha--bloco">
        <MensagemFormulario
          v-if="arquivado && !visaoDoCasal"
          variante="informacao"
          :mensagem="TEXTOS_FINANCEIRO.arquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !financeiro"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_FINANCEIRO.erroTitulo"
          :mensagem="TEXTOS_FINANCEIRO.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_FINANCEIRO.erroTitulo"
          :mensagem="TEXTOS_FINANCEIRO.erroTexto"
          @tentar-novamente="store.carregar(id)"
        />

        <template v-else-if="semFornecedores">
          <EstadoPrimeiroAcesso
            v-if="podeGerenciar"
            :titulo="TEXTOS_FINANCEIRO.primeiroAcessoTitulo"
            :descricao="TEXTOS_FINANCEIRO.vazioSemContratadoTexto"
            :passos="[...TEXTOS_FINANCEIRO.primeiroAcessoPassos]"
            :rotulo-acao="TEXTOS_FINANCEIRO.irFornecedores"
            data-teste="financeiro-primeiro-acesso"
            @continuar="irParaFornecedores"
          />
          <EstadoVazio
            v-else
            icone="financeiro"
            :titulo="visaoDoCasal ? TEXTOS_FINANCEIRO.vazioCasalTitulo : TEXTOS_FINANCEIRO.vazioSemContratadoTitulo"
            :descricao="visaoDoCasal ? TEXTOS_FINANCEIRO.vazioCasalTexto : TEXTOS_FINANCEIRO.vazioSemContratadoTexto"
            data-teste="financeiro-vazio"
          />
        </template>

        <template v-else-if="financeiro">
          <MensagemFormulario
            v-if="faixaAlertas"
            :variante="faixaAlertas.variante"
            :mensagem="faixaAlertas.texto"
            data-teste="faixa-alertas"
          />

          <ul
            class="financeiro__indicadores grade grade--indicadores"
            :aria-label="TEXTOS_FINANCEIRO.indicadoresRotulo"
            data-teste="indicadores-financeiro"
          >
            <li
              v-for="indicador in indicadores"
              :key="indicador.chave"
              class="financeiro__indicador cartao pilha pilha--campo"
              :data-teste="`indicador-${indicador.chave}`"
            >
              <span class="texto-rotulo">{{ indicador.rotulo }}</span>
              <span
                class="financeiro__indicador-valor numeros-tabulares"
                :class="{ 'financeiro__indicador-valor--alerta': indicador.alerta }"
                data-teste="indicador-valor"
              >{{ indicador.valor }}</span>
              <span class="financeiro__indicador-apoio">{{ indicador.apoio }}</span>
            </li>
          </ul>

          <div class="financeiro__corpo">
            <aside
              class="financeiro__lateral"
              :aria-label="TEXTOS_FINANCEIRO.lateralRotulo"
              data-teste="lateral-orcamento"
            >
              <ResumoOrcamento
                :resumo="financeiro.resumo"
                exibir-pagamentos
              />
            </aside>

            <div class="financeiro__principal pilha pilha--cartao">
              <SelectButton
                v-model="visao"
                class="financeiro__visao"
                :options="opcoesVisao"
                option-label="rotulo"
                option-value="valor"
                :allow-empty="false"
                :aria-label="TEXTOS_FINANCEIRO.alternanciaRotulo"
                data-teste="alternar-visao"
              />

              <section
                v-if="visao === 'vencimento'"
                class="financeiro__painel"
                aria-labelledby="titulo-livro"
                data-teste="livro-vencimentos"
              >
                <h2
                  id="titulo-livro"
                  class="financeiro__titulo-painel"
                >
                  {{ TEXTOS_FINANCEIRO.livroTitulo }}
                </h2>

                <EstadoVazio
                  v-if="semParcelas"
                  icone="calendario"
                  :titulo="TEXTOS_FINANCEIRO.vazioLivro"
                  :descricao="podeGerenciar ? TEXTOS_FINANCEIRO.vazioLivroTexto : undefined"
                  data-teste="livro-vazio"
                />

                <template v-else>
                  <div
                    v-if="livro.vencidas.length > 0"
                    class="financeiro__grupo"
                    data-teste="grupo-vencidas"
                  >
                    <h3
                      id="grupo-vencidas"
                      class="financeiro__titulo-grupo texto-rotulo"
                    >
                      {{ TEXTOS_FINANCEIRO.grupoVencidas }}
                    </h3>
                    <ul
                      class="financeiro__lista"
                      aria-labelledby="grupo-vencidas"
                    >
                      <LinhaParcela
                        v-for="parcela in livro.vencidas"
                        :key="parcela.id"
                        :nome-empresa="parcela.nomeEmpresa"
                        :numero="parcela.numero"
                        :total="parcela.totalParcelas"
                        :valor="parcela.valor"
                        :vencimento="parcela.vencimento"
                        :situacao="parcela.situacao"
                        :dias-para-vencimento="parcela.diasParaVencimento"
                        :vence-em-breve="parcela.venceEmBreve"
                        :observacao="parcela.observacao"
                      >
                        <template
                          v-if="podeGerenciar"
                          #acoes
                        >
                          <MenuAcoes
                            :itens="acoesDaParcela(parcela)"
                            :rotulo="TEXTOS_FINANCEIRO.maisAcoes"
                            :rotulo-acessivel="TEXTOS_FINANCEIRO.maisAcoesAria(parcela.numero, parcela.totalParcelas, parcela.nomeEmpresa)"
                            :desabilitado="parcelaEmAndamento !== null"
                            somente-icone
                            @selecionar="executarAcao(parcela, parcela.nomeEmpresa, $event)"
                          />
                        </template>
                      </LinhaParcela>
                    </ul>
                  </div>

                  <LinhaHoje :hoje="financeiro.hoje" />

                  <div
                    v-for="grupo in [
                      { chave: 'proximas', titulo: TEXTOS_FINANCEIRO.grupoProximas, itens: livro.proximas },
                      { chave: 'depois', titulo: TEXTOS_FINANCEIRO.grupoDepois, itens: livro.depois },
                    ].filter((item) => item.itens.length > 0)"
                    :key="grupo.chave"
                    class="financeiro__grupo"
                    :data-teste="`grupo-${grupo.chave}`"
                  >
                    <h3
                      :id="`grupo-${grupo.chave}`"
                      class="financeiro__titulo-grupo texto-rotulo"
                    >
                      {{ grupo.titulo }}
                    </h3>
                    <ul
                      class="financeiro__lista"
                      :aria-labelledby="`grupo-${grupo.chave}`"
                    >
                      <LinhaParcela
                        v-for="parcela in grupo.itens"
                        :key="parcela.id"
                        :nome-empresa="parcela.nomeEmpresa"
                        :numero="parcela.numero"
                        :total="parcela.totalParcelas"
                        :valor="parcela.valor"
                        :vencimento="parcela.vencimento"
                        :situacao="parcela.situacao"
                        :dias-para-vencimento="parcela.diasParaVencimento"
                        :vence-em-breve="parcela.venceEmBreve"
                        :observacao="parcela.observacao"
                      >
                        <template
                          v-if="podeGerenciar"
                          #acoes
                        >
                          <MenuAcoes
                            :itens="acoesDaParcela(parcela)"
                            :rotulo="TEXTOS_FINANCEIRO.maisAcoes"
                            :rotulo-acessivel="TEXTOS_FINANCEIRO.maisAcoesAria(parcela.numero, parcela.totalParcelas, parcela.nomeEmpresa)"
                            :desabilitado="parcelaEmAndamento !== null"
                            somente-icone
                            @selecionar="executarAcao(parcela, parcela.nomeEmpresa, $event)"
                          />
                        </template>
                      </LinhaParcela>
                    </ul>
                  </div>

                  <div
                    v-if="livro.pagas.length > 0"
                    class="financeiro__grupo"
                    data-teste="grupo-pagas"
                  >
                    <h3 class="financeiro__titulo-grupo texto-rotulo">
                      <button
                        type="button"
                        class="financeiro__alternar-pagas"
                        :aria-expanded="pagasAbertas"
                        aria-controls="lista-pagas"
                        data-teste="alternar-pagas"
                        @click="pagasAbertas = !pagasAbertas"
                      >
                        <span
                          class="ie ie-seta-baixo financeiro__seta"
                          :class="{ 'financeiro__seta--aberta': pagasAbertas }"
                          aria-hidden="true"
                        />
                        {{ TEXTOS_FINANCEIRO.grupoPagas(livro.pagas.length, formatarMoeda(deCentavos(totalPagasCentavos))) }}
                      </button>
                    </h3>
                    <ul
                      v-show="pagasAbertas"
                      id="lista-pagas"
                      class="financeiro__lista"
                    >
                      <LinhaParcela
                        v-for="parcela in livro.pagas"
                        :key="parcela.id"
                        :nome-empresa="parcela.nomeEmpresa"
                        :numero="parcela.numero"
                        :total="parcela.totalParcelas"
                        :valor="parcela.valor"
                        :vencimento="parcela.vencimento"
                        :situacao="parcela.situacao"
                        :dias-para-vencimento="parcela.diasParaVencimento"
                        :paga-em="parcela.pagaEm"
                        :observacao="parcela.observacao"
                        :possui-comprovante="parcela.comprovante !== null"
                      >
                        <template
                          v-if="podeGerenciar"
                          #acoes
                        >
                          <MenuAcoes
                            :itens="acoesDaParcela(parcela)"
                            :rotulo="TEXTOS_FINANCEIRO.maisAcoes"
                            :rotulo-acessivel="TEXTOS_FINANCEIRO.maisAcoesAria(parcela.numero, parcela.totalParcelas, parcela.nomeEmpresa)"
                            :desabilitado="parcelaEmAndamento !== null"
                            somente-icone
                            @selecionar="executarAcao(parcela, parcela.nomeEmpresa, $event)"
                          />
                        </template>
                        <template
                          v-else-if="parcela.comprovante"
                          #acoes
                        >
                          <Button
                            :label="TEXTOS_PARCELA.baixarComprovante"
                            icon="ie ie-exportar"
                            severity="secondary"
                            text
                            :loading="parcelaEmAndamento === parcela.id"
                            :aria-label="baixarAria(parcela, parcela.nomeEmpresa)"
                            data-teste="baixar-comprovante"
                            @click="baixar(parcela)"
                          />
                        </template>
                      </LinhaParcela>
                    </ul>
                  </div>
                </template>
              </section>

              <div
                v-else
                class="financeiro__fornecedores pilha pilha--cartao"
                data-teste="visao-fornecedores"
              >
                <p
                  v-if="contratados.length === 0"
                  class="financeiro__nota"
                >
                  {{ TEXTOS_FINANCEIRO.vazioSemContratadoTexto }}
                  <RouterLink :to="{ name: 'casamento-fornecedores', params: { id } }">
                    {{ TEXTOS_FINANCEIRO.irFornecedores }}
                  </RouterLink>
                </p>
                <section
                  v-for="fornecedor in [...contratados, ...cancelados]"
                  :key="fornecedor.fornecedorCasamentoId"
                  class="financeiro__painel"
                  :aria-labelledby="`fornecedor-${fornecedor.fornecedorCasamentoId}`"
                  :data-teste="`fornecedor-${fornecedor.fornecedorCasamentoId}`"
                >
                  <div class="financeiro__cabecalho-fornecedor">
                    <div class="financeiro__identidade">
                      <h2
                        :id="`fornecedor-${fornecedor.fornecedorCasamentoId}`"
                        class="financeiro__titulo-painel"
                      >
                        {{ fornecedor.nomeEmpresa }}
                      </h2>
                      <span class="financeiro__categoria">{{ ROTULOS_CATEGORIA_FORNECEDOR[fornecedor.categoria] }}<template v-if="fornecedor.servico"> · {{ fornecedor.servico }}</template></span>
                    </div>
                    <BadgeStatus
                      v-if="fornecedor.status === 'Cancelado'"
                      :texto="TEXTOS_FINANCEIRO.rotuloCancelado"
                      variante="neutro"
                    />
                    <span
                      v-else
                      class="financeiro__pago-de numeros-tabulares"
                      data-teste="fornecedor-pago-de"
                    >{{ pagoDe(fornecedor) }}</span>
                  </div>

                  <p
                    v-if="fornecedor.status === 'Cancelado'"
                    class="financeiro__nota financeiro__nota--recuada"
                  >
                    {{ TEXTOS_FINANCEIRO.cancelado }}
                  </p>
                  <MensagemFormulario
                    v-else-if="saldo(fornecedor)"
                    class="financeiro__aviso-saldo"
                    variante="alerta"
                    :mensagem="saldo(fornecedor) ?? ''"
                    data-teste="aviso-saldo"
                  />

                  <div
                    v-if="podeGerenciar && fornecedor.status === 'Contratado'"
                    class="financeiro__acoes-fornecedor"
                    role="group"
                    :aria-label="TEXTOS_FINANCEIRO.acoesFornecedorAria(fornecedor.nomeEmpresa)"
                  >
                    <Button
                      :label="TEXTOS_FINANCEIRO.gerarParcelas"
                      icon="ie ie-calendario"
                      severity="secondary"
                      outlined
                      :disabled="paraCentavos(fornecedor.saldoAParcelar) <= 0"
                      data-teste="gerar-parcelas"
                      @click="fornecedorGerador = fornecedor"
                    />
                    <Button
                      :label="TEXTOS_FINANCEIRO.adicionarParcela"
                      icon="ie ie-mais"
                      severity="secondary"
                      text
                      data-teste="adicionar-parcela-fornecedor"
                      @click="adicionarParcela(fornecedor.fornecedorCasamentoId)"
                    />
                  </div>

                  <p
                    v-if="fornecedor.parcelas.length === 0"
                    class="financeiro__nota financeiro__nota--recuada"
                  >
                    {{ TEXTOS_FINANCEIRO.vazioFornecedor }}
                  </p>
                  <ul
                    v-else
                    class="financeiro__lista"
                  >
                    <LinhaParcela
                      v-for="parcela in fornecedor.parcelas"
                      :key="parcela.id"
                      :nome-empresa="fornecedor.nomeEmpresa"
                      :numero="parcela.numero"
                      :total="parcela.totalParcelas"
                      :valor="parcela.valor"
                      :vencimento="parcela.vencimento"
                      :situacao="parcela.situacao"
                      :dias-para-vencimento="parcela.diasParaVencimento"
                      :vence-em-breve="parcela.venceEmBreve"
                      :paga-em="parcela.pagaEm"
                      :observacao="parcela.observacao"
                      :possui-comprovante="parcela.comprovante !== null"
                      :historico="fornecedor.status === 'Cancelado'"
                    >
                      <template
                        v-if="podeGerenciar && fornecedor.status === 'Contratado'"
                        #acoes
                      >
                        <MenuAcoes
                          :itens="acoesDaParcela(parcela)"
                          :rotulo="TEXTOS_FINANCEIRO.maisAcoes"
                          :rotulo-acessivel="TEXTOS_FINANCEIRO.maisAcoesAria(parcela.numero, parcela.totalParcelas, fornecedor.nomeEmpresa)"
                          :desabilitado="parcelaEmAndamento !== null"
                          somente-icone
                          @selecionar="executarAcao(parcela, fornecedor.nomeEmpresa, $event)"
                        />
                      </template>
                      <template
                        v-else-if="parcela.comprovante"
                        #acoes
                      >
                        <Button
                          :label="TEXTOS_PARCELA.baixarComprovante"
                          icon="ie ie-exportar"
                          severity="secondary"
                          text
                          :loading="parcelaEmAndamento === parcela.id"
                          :aria-label="baixarAria(parcela, fornecedor.nomeEmpresa)"
                          data-teste="baixar-comprovante"
                          @click="baixar(parcela)"
                        />
                      </template>
                    </LinhaParcela>
                  </ul>
                </section>
              </div>

              <p
                v-if="visaoDoCasal"
                class="financeiro__nota"
                data-teste="rodape-casal"
              >
                {{ TEXTOS_FINANCEIRO.rodapeCasal }}
              </p>
            </div>
          </div>
        </template>
      </div>

      <template v-if="podeGerenciar && financeiro">
        <input
          ref="entradaArquivo"
          class="somente-leitor-tela"
          type="file"
          tabindex="-1"
          aria-hidden="true"
          :accept="ACEITE_COMPROVANTE"
          data-teste="entrada-comprovante"
          @change="aoEscolherArquivo"
        >

        <DialogoParcela
          :visivel="dialogoParcela !== null"
          :casamento-id="id"
          :fornecedores="fornecedores"
          :vinculo-id="dialogoParcela?.vinculoId ?? null"
          :parcela="dialogoParcela?.parcela ?? null"
          @update:visivel="fecharDialogoParcela"
          @salvo="aoSalvar"
        />

        <DialogoGerarParcelas
          :visivel="fornecedorGerador !== null"
          :casamento-id="id"
          :fornecedor="fornecedorGerador"
          @update:visivel="fecharGerador"
          @gerado="aoSalvar"
        />

        <DialogoPagamento
          :visivel="parcelaPagamento !== null"
          :casamento-id="id"
          :parcela="parcelaPagamento?.parcela ?? null"
          :nome-empresa="parcelaPagamento?.nomeEmpresa ?? ''"
          :hoje="financeiro.hoje"
          @update:visivel="fecharPagamento"
          @pago="aoPagar"
        />

        <DialogoConfirmacao
          :visivel="confirmacao !== null"
          :titulo="tituloConfirmacao"
          :mensagem="mensagemConfirmacao"
          :rotulo-confirmar="rotuloConfirmacao"
          :rotulo-cancelar="TEXTOS_PARCELA.cancelar"
          :executando="executandoConfirmacao"
          perigoso
          @update:visivel="alterarVisibilidadeConfirmacao"
          @confirmar="confirmar"
        />
      </template>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.financeiro {
  --financeiro-largura-lateral: 22rem;
  container: financeiro / inline-size;
}

.financeiro__indicadores {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.financeiro__indicador {
  padding: var(--p-ritmo-grupo);
}

.financeiro__indicador-valor {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  font-variant-numeric: lining-nums tabular-nums;
  color: var(--p-cor-texto);
}

.financeiro__indicador-valor--alerta {
  color: var(--p-cor-erro-texto);
}

.financeiro__indicador-apoio {
  margin-top: auto;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.financeiro__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'lateral'
    'principal';
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.financeiro__lateral {
  grid-area: lateral;
  min-width: 0;
}

.financeiro__principal {
  grid-area: principal;
}

.financeiro__visao {
  align-self: flex-start;
  max-width: 100%;
  overflow-x: auto;
}

.financeiro__painel {
  padding-block: var(--p-ritmo-cartao) var(--p-ritmo-campo);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.financeiro .financeiro__titulo-painel {
  margin: 0;
  padding-inline: var(--p-ritmo-grupo);
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-leve);
  color: var(--p-cor-texto);
}

.financeiro__grupo {
  margin-top: var(--p-ritmo-grupo);
}

.financeiro .financeiro__titulo-grupo {
  margin: 0;
  padding: var(--p-ritmo-campo) var(--p-ritmo-grupo) 0;
}

.financeiro__lista {
  margin: 0;
  padding: 0;
}

.financeiro__alternar-pagas {
  display: inline-flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
  min-height: var(--p-dimensao-alvo-toque);
  padding: 0;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  background: none;
  border: 0;
  border-radius: var(--p-raio-controle);
  cursor: pointer;
}

.financeiro__seta {
  transition: transform var(--p-duracao-padrao) ease-out;
}

.financeiro__seta--aberta {
  transform: rotate(180deg);
}

.financeiro__cabecalho-fornecedor {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  padding-inline-end: var(--p-ritmo-grupo);
}

.financeiro__identidade {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.financeiro__categoria {
  padding-inline: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.financeiro__pago-de {
  padding-inline-start: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.financeiro__aviso-saldo {
  margin: var(--p-ritmo-grupo) var(--p-ritmo-grupo) 0;
}

.financeiro__acoes-fornecedor {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
  padding: var(--p-ritmo-grupo) var(--p-ritmo-grupo) 0;
}

.financeiro__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.financeiro__nota--recuada {
  padding: var(--p-ritmo-grupo);
}

.financeiro__voltar {
  display: inline-block;
  margin-top: var(--p-ritmo-grupo);
}

@container financeiro (min-width: 48rem) {
  .financeiro__indicador {
    padding: var(--p-ritmo-cartao);
  }

  .financeiro__indicador-valor {
    white-space: nowrap;
    font-size: var(--p-fonte-tamanho-pagina-celular);
  }
}

@container financeiro (min-width: 56rem) {
  .financeiro__indicadores {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container financeiro (min-width: 64rem) {
  .financeiro__corpo {
    grid-template-columns: minmax(0, 1fr) var(--financeiro-largura-lateral);
    grid-template-areas: 'principal lateral';
  }

  .financeiro__lateral {
    position: sticky;
    top: var(--p-ritmo-cartao);
  }
}

@media (prefers-reduced-motion: reduce) {
  .financeiro__seta {
    transition: none;
  }
}
</style>
