<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import ListagemDados from '@/componentes/base/ListagemDados.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ResumoCardapio from '@/componentes/base/ResumoCardapio.vue'
import type { ColunaListagem, ItemMenuAcoes, LinhaCardapio } from '@/componentes/base/tipos'
import DialogoRestricaoAlimentar from '@/componentes/convidados/DialogoRestricaoAlimentar.vue'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useConvidadosStore } from '@/stores/convidados'
import { useRestricoesAlimentaresStore } from '@/stores/restricoesAlimentares'
import { ROTULOS_RESPOSTA, VARIANTE_RESPOSTA } from '@/textos/convidados'
import { ROTULOS_ORIGEM_CONSENTIMENTO, ROTULOS_TIPO_RESTRICAO, TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import type {
  PessoaRestricaoAlimentarDto,
  PessoaSelecionavel,
  RestricaoPessoaFormulario,
  SalvarRestricaoAlimentarRequest,
} from '@/tipos/dadosSensiveis'
import { contemTexto } from '@/utilitarios/busca'
import { descreverTipos } from '@/utilitarios/dadosSensiveis'
import { formatarData, formatarDataCalendario, formatarNomesCasal } from '@/utilitarios/formatacao'

interface LinhaRestricao extends Record<string, unknown> {
  convidadoId: string
  nome: string
  restricoes: string
  necessidade: string
  resposta: string
  origem: string
  pessoa: PessoaRestricaoAlimentarDto
}

const props = defineProps<{ id: string }>()

const casamentos = useCasamentosStore()
const convidados = useConvidadosStore()
const store = useRestricoesAlimentaresStore()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const busca = ref('')
const dialogoVisivel = ref(false)
const pessoaEditada = ref<PessoaRestricaoAlimentarDto | null>(null)
const salvando = ref(false)
const erroDialogo = ref<string | null>(null)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const relatorio = computed(() => (store.casamentoId === props.id ? store.relatorio : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const dadosExcluidos = computed(() => Boolean(relatorio.value?.dadosExcluidosEm) && (relatorio.value?.totalPessoas ?? 0) === 0)
const podeRegistrar = computed(() => relatorio.value?.podeRegistrar ?? false)
const semRestricoes = computed(() => relatorio.value?.totalPessoas === 0 && relatorio.value.registrosIlegiveis === 0)
const mensagemExclusaoPrevista = computed(() =>
  relatorio.value
    ? TEXTOS_DADOS_SENSIVEIS.exclusaoPrevista(formatarDataCalendario(relatorio.value.dataExclusaoPrevista), relatorio.value.diasRetencao)
    : '',
)

const mensagemErro = computed(() => {
  if (!falha.value) {
    return null
  }
  return falha.value.tipo === 'semPermissao' ? TEXTOS_DADOS_SENSIVEIS.semAcesso : TEXTOS_DADOS_SENSIVEIS.erroCarregar
})

const linhasCardapio = computed<LinhaCardapio[]>(() => {
  if (!relatorio.value) {
    return []
  }
  const linhas: LinhaCardapio[] = relatorio.value.porTipo.map((contagem) => ({
    chave: contagem.tipo,
    rotulo: ROTULOS_TIPO_RESTRICAO[contagem.tipo],
    valor: contagem.quantidade,
  }))
  if (relatorio.value.outrasRestricoes > 0) {
    linhas.push({ chave: 'outras', rotulo: TEXTOS_DADOS_SENSIVEIS.outrasRestricoes, valor: relatorio.value.outrasRestricoes })
  }
  if (relatorio.value.necessidadesEspeciais > 0) {
    linhas.push({
      chave: 'necessidades',
      rotulo: TEXTOS_DADOS_SENSIVEIS.necessidadesEspeciais,
      valor: relatorio.value.necessidadesEspeciais,
    })
  }
  return linhas
})

const linhas = computed<LinhaRestricao[]>(() =>
  (relatorio.value?.pessoas ?? [])
    .filter((pessoa) => contemTexto(busca.value, pessoa.nome))
    .map((pessoa) => ({
      convidadoId: pessoa.convidadoId,
      nome: pessoa.nome,
      restricoes: descreverTipos(pessoa.tipos, pessoa.outraRestricao),
      necessidade: pessoa.necessidadeEspecial ?? TEXTOS_DADOS_SENSIVEIS.nenhuma,
      resposta: pessoa.resposta,
      origem: ROTULOS_ORIGEM_CONSENTIMENTO[pessoa.origemConsentimento],
      pessoa,
    })),
)

const colunas: ColunaListagem<LinhaRestricao>[] = [
  { campo: 'nome', titulo: TEXTOS_DADOS_SENSIVEIS.colunaNome, principal: true, largura: '24%' },
  { campo: 'restricoes', titulo: TEXTOS_DADOS_SENSIVEIS.colunaRestricoes },
  { campo: 'necessidade', titulo: TEXTOS_DADOS_SENSIVEIS.colunaNecessidade },
  { campo: 'resposta', titulo: TEXTOS_DADOS_SENSIVEIS.colunaResposta, largura: '9rem' },
  { campo: 'origem', titulo: TEXTOS_DADOS_SENSIVEIS.colunaOrigem, ocultarNoTablet: true },
]

const pessoasSelecionaveis = computed<PessoaSelecionavel[]>(() => {
  const lista = convidados.casamentoId === props.id ? convidados.lista : null
  const comRestricao = new Set((relatorio.value?.pessoas ?? []).map((pessoa) => pessoa.convidadoId))
  return (lista?.convites ?? [])
    .flatMap((convite) =>
      convite.convidados
        .filter((convidado) => convidado.resposta !== 'Recusado' && !comRestricao.has(convidado.id))
        .map((convidado) => ({ convidadoId: convidado.id, conviteId: convite.id, nome: convidado.nome })),
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const pessoaFixa = computed<PessoaSelecionavel | null>(() =>
  pessoaEditada.value
    ? { convidadoId: pessoaEditada.value.convidadoId, conviteId: pessoaEditada.value.conviteId, nome: pessoaEditada.value.nome }
    : null,
)

const inicialDialogo = computed<RestricaoPessoaFormulario | null>(() =>
  pessoaEditada.value
    ? {
        situacao: 'informar',
        tipos: [...pessoaEditada.value.tipos],
        outraRestricao: pessoaEditada.value.outraRestricao ?? '',
        necessidadeEspecial: pessoaEditada.value.necessidadeEspecial ?? '',
      }
    : null,
)

const itensMenu: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: TEXTOS_DADOS_SENSIVEIS.editar, icone: 'ie ie-editar' },
  { chave: 'remover', rotulo: TEXTOS_DADOS_SENSIVEIS.remover, icone: 'ie ie-excluir', perigoso: true },
]

watch(
  () => props.id,
  (id) => {
    busca.value = ''
    void casamentos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = `${TEXTOS_DADOS_SENSIVEIS.tituloPainel} · ${valor}`
    }
  },
  { immediate: true },
)

function abrirRegistro() {
  pessoaEditada.value = null
  erroDialogo.value = null
  dialogoVisivel.value = true
  if (convidados.casamentoId !== props.id || !convidados.lista) {
    void convidados.carregar(props.id)
  }
}

function abrirEdicao(pessoa: PessoaRestricaoAlimentarDto) {
  pessoaEditada.value = pessoa
  erroDialogo.value = null
  dialogoVisivel.value = true
}

async function salvar(pessoa: PessoaSelecionavel, request: SalvarRestricaoAlimentarRequest) {
  salvando.value = true
  erroDialogo.value = null
  const resultado = await store.salvar(props.id, pessoa.conviteId, pessoa.convidadoId, request)
  salvando.value = false

  if (!resultado.ok) {
    if (resultado.falha.tipo === 'regra' || resultado.falha.tipo === 'validacao') {
      erroDialogo.value = resultado.falha.mensagem ?? Object.values(resultado.falha.errosCampos)[0] ?? TEXTOS_DADOS_SENSIVEIS.erroSemConteudo
      return
    }
    notificacao.erro()
    return
  }

  dialogoVisivel.value = false
  notificacao.sucesso(TEXTOS_DADOS_SENSIVEIS.salva)
  convidados.invalidar(props.id)
  await store.carregar(props.id)
}

function remover(pessoa: PessoaRestricaoAlimentarDto) {
  confirmarExclusao({
    nomeItem: TEXTOS_DADOS_SENSIVEIS.itemExclusao(pessoa.nome),
    mensagemSucesso: TEXTOS_DADOS_SENSIVEIS.removida(pessoa.nome),
    aoConfirmar: async () => {
      const resultado = await store.remover(props.id, pessoa.conviteId, pessoa.convidadoId)
      if (!resultado.ok) {
        throw new Error(resultado.falha.mensagem ?? TEXTOS_DADOS_SENSIVEIS.erroCarregar)
      }
      await store.carregar(props.id)
    },
  })
}

function selecionarAcao(pessoa: PessoaRestricaoAlimentarDto, acao: string) {
  if (acao === 'editar') {
    abrirEdicao(pessoa)
  } else if (acao === 'remover') {
    remover(pessoa)
  }
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="TEXTOS_DADOS_SENSIVEIS.tituloPainel"
      :descricao="TEXTOS_DADOS_SENSIVEIS.descricaoPainel"
    >
      <template #acoes>
        <Button
          v-if="relatorio && podeRegistrar"
          :label="TEXTOS_DADOS_SENSIVEIS.registrar"
          icon="ie ie-mais"
          data-teste="registrar-restricao"
          @click="abrirRegistro"
        />
      </template>
    </CabecalhoPagina>

    <div class="restricoes pilha pilha--bloco">
      <EstadoCarregando
        v-if="store.carregando && !relatorio"
        variante="lista"
      />

      <EstadoErro
        v-else-if="mensagemErro"
        :mensagem="mensagemErro"
        :pode-tentar-novamente="falha?.tipo !== 'semPermissao' && falha?.tipo !== 'naoEncontrado'"
        @tentar-novamente="store.carregar(id)"
      />

      <template v-else-if="relatorio">
        <EstadoVazio
          v-if="dadosExcluidos"
          :titulo="TEXTOS_DADOS_SENSIVEIS.dadosExcluidosTitulo"
          :descricao="TEXTOS_DADOS_SENSIVEIS.dadosExcluidosTexto(formatarData(relatorio.dadosExcluidosEm))"
          icone="permissao"
          data-teste="restricoes-excluidas"
        />

        <div
          v-else-if="semRestricoes"
          class="pilha pilha--cartao"
        >
          <EstadoVazio
            :titulo="TEXTOS_DADOS_SENSIVEIS.vazioTitulo"
            :descricao="TEXTOS_DADOS_SENSIVEIS.vazioTexto"
            icone="lista"
            data-teste="restricoes-vazio"
          >
            <template
              v-if="podeRegistrar"
              #acao
            >
              <Button
                :label="TEXTOS_DADOS_SENSIVEIS.registrar"
                severity="secondary"
                outlined
                @click="abrirRegistro"
              />
            </template>
          </EstadoVazio>

          <MensagemFormulario
            variante="informacao"
            :mensagem="mensagemExclusaoPrevista"
            data-teste="restricoes-exclusao-prevista"
          />
        </div>

        <div
          v-else
          class="restricoes__corpo"
          data-teste="restricoes-corpo"
        >
          <aside
            class="restricoes__lateral pilha pilha--grupo"
            :aria-label="TEXTOS_DADOS_SENSIVEIS.resumoBuffet"
            data-teste="restricoes-lateral"
          >
            <ResumoCardapio
              :titulo="TEXTOS_DADOS_SENSIVEIS.resumoBuffet"
              :linhas="linhasCardapio"
              :vazio="TEXTOS_DADOS_SENSIVEIS.semConfirmados"
            >
              <template #rodape>
                {{ TEXTOS_DADOS_SENSIVEIS.totais(relatorio.totalPessoas, relatorio.totalConfirmados) }}
              </template>
            </ResumoCardapio>

            <MensagemFormulario
              variante="informacao"
              :mensagem="mensagemExclusaoPrevista"
              data-teste="restricoes-exclusao-prevista"
            />
          </aside>

          <div class="restricoes__principal pilha pilha--cartao">
            <MensagemFormulario
              v-if="relatorio.registrosIlegiveis > 0"
              :mensagem="TEXTOS_DADOS_SENSIVEIS.ilegiveis(relatorio.registrosIlegiveis)"
              data-teste="restricoes-ilegiveis"
            />

            <ListagemDados
              v-model:busca="busca"
              :itens="linhas"
              :colunas="colunas"
              chave="convidadoId"
              :rotulo="TEXTOS_DADOS_SENSIVEIS.listaRotulo"
              :placeholder-busca="TEXTOS_DADOS_SENSIVEIS.buscaPlaceholder"
              :titulo-vazio="TEXTOS_DADOS_SENSIVEIS.vazioTitulo"
            >
              <template #celula-nome="{ item }">
                <span class="restricoes__nome">
                  <span>{{ item.nome }}</span>
                  <span
                    v-if="item.pessoa.acompanhante"
                    class="restricoes__marcador"
                  >{{ TEXTOS_DADOS_SENSIVEIS.acompanhante }}</span>
                </span>
              </template>
              <template #celula-resposta="{ item }">
                <BadgeStatus
                  :texto="ROTULOS_RESPOSTA[item.pessoa.resposta]"
                  :variante="VARIANTE_RESPOSTA[item.pessoa.resposta]"
                />
              </template>
              <template
                v-if="podeRegistrar"
                #acoes-linha="{ item }"
              >
                <MenuAcoes
                  :itens="itensMenu"
                  :rotulo="TEXTOS_DADOS_SENSIVEIS.editar"
                  :rotulo-acessivel="TEXTOS_DADOS_SENSIVEIS.acoesPessoa(item.nome)"
                  @selecionar="selecionarAcao(item.pessoa, $event)"
                />
              </template>
            </ListagemDados>
          </div>
        </div>
      </template>
    </div>

    <DialogoRestricaoAlimentar
      v-model:visivel="dialogoVisivel"
      :pessoas="pessoasSelecionaveis"
      :pessoa-fixa="pessoaFixa"
      :inicial="inicialDialogo"
      :executando="salvando"
      :mensagem-erro="erroDialogo"
      @salvar="salvar"
    />
  </LayoutPainelUsuario>
</template>

<style scoped>
.restricoes {
  --restricoes-largura-lateral: 20rem;

  container: restricoes / inline-size;
}

.restricoes__corpo {
  display: grid;
  grid-template-areas:
    'lateral'
    'principal';
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.restricoes__lateral {
  grid-area: lateral;
  min-width: 0;
}

.restricoes__lateral :deep(.resumo-cardapio) {
  max-width: none;
}

.restricoes__principal {
  grid-area: principal;
  min-width: 0;
}

.restricoes__principal :deep(.listagem__tabela .listagem__acoes-linha .p-button-label) {
  display: none;
}

.restricoes__nome {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
}

.restricoes__marcador {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

@container restricoes (min-width: 40rem) {
  .restricoes__lateral {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

@container restricoes (max-width: 63.99rem) {
  .restricoes__principal :deep(.listagem__tabela .listagem__coluna--secundaria) {
    display: none;
  }
}

@container restricoes (min-width: 80rem) {
  .restricoes__corpo {
    grid-template-areas: 'principal lateral';
    grid-template-columns: minmax(0, 1fr) var(--restricoes-largura-lateral);
  }

  .restricoes__lateral {
    display: flex;
    position: sticky;
    top: var(--p-ritmo-bloco);
  }
}
</style>
