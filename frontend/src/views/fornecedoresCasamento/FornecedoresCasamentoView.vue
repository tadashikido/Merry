<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import LinhaFornecedorCasamento from '@/componentes/base/LinhaFornecedorCasamento.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ResumoOrcamento from '@/componentes/base/ResumoOrcamento.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import DialogoImportarFornecedores from '@/componentes/fornecedoresCasamento/DialogoImportarFornecedores.vue'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useFornecedoresCasamentoStore } from '@/stores/fornecedoresCasamento'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { TEXTOS_PARCELAS_FORNECEDOR } from '@/textos/financeiro'
import { TEXTOS_CONTRATO, TEXTOS_FORNECEDORES_CASAMENTO, TEXTOS_RESUMO_ORCAMENTO } from '@/textos/fornecedoresCasamento'
import type { FornecedorCasamentoDto, ResultadoImportacaoFornecedoresDto } from '@/tipos/fornecedoresCasamento'
import { formatarDataCalendarioComDiaSemana, formatarNomesCasal } from '@/utilitarios/formatacao'
import { agruparVinculosPorCategoria } from '@/utilitarios/fornecedoresCasamento'

type AcaoVinculo = 'editar' | 'baixar' | 'parcelas' | 'remover'

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const store = useFornecedoresCasamentoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const importando = ref(false)
const vinculoRemocao = ref<FornecedorCasamentoDto | null>(null)
const removendo = ref(false)
const vinculoEmAndamento = ref<string | null>(null)
const vinculoComParcelas = ref<FornecedorCasamentoDto | null>(null)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const lista = computed(() => (store.casamentoId === props.id ? store.lista : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const visaoDoCasal = computed(() => autenticacao.ehCasal)
const arquivado = computed(() => lista.value?.casamentoArquivado ?? casamento.value?.arquivado ?? false)
const podeGerenciar = computed(() => !visaoDoCasal.value && lista.value?.somenteLeitura === false)
const grupos = computed(() => agruparVinculosPorCategoria(lista.value?.vinculos ?? []))
const semVinculos = computed(() => lista.value !== null && lista.value.vinculos.length === 0)
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
      document.title = TEXTOS_FORNECEDORES_CASAMENTO.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

function adicionar() {
  void roteador.push({ name: 'fornecedor-casamento-novo', params: { id: props.id } })
}

function destinoEdicao(vinculo: FornecedorCasamentoDto) {
  return podeGerenciar.value
    ? { name: 'fornecedor-casamento-editar', params: { id: props.id, vinculoId: vinculo.id } }
    : null
}

function acoesDoVinculo(vinculo: FornecedorCasamentoDto): ItemMenuAcoes[] {
  const itens: ItemMenuAcoes[] = [
    { chave: 'editar', rotulo: TEXTOS_FORNECEDORES_CASAMENTO.menuEditar, icone: 'ie ie-editar' },
  ]
  if (vinculo.contrato) {
    itens.push({ chave: 'baixar', rotulo: TEXTOS_FORNECEDORES_CASAMENTO.menuBaixar, icone: 'ie ie-exportar' })
  }
  if (vinculo.parcelas && vinculo.parcelas.quantidade > 0) {
    itens.push({ chave: 'parcelas', rotulo: TEXTOS_PARCELAS_FORNECEDOR.verParcelas, icone: 'ie ie-financeiro' })
  }
  itens.push({ chave: 'remover', rotulo: TEXTOS_FORNECEDORES_CASAMENTO.menuRemover, icone: 'ie ie-excluir', perigoso: true })
  return itens
}

async function baixar(vinculo: FornecedorCasamentoDto) {
  vinculoEmAndamento.value = vinculo.id
  const resultado = await store.baixarContrato(props.id, vinculo)
  vinculoEmAndamento.value = null
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_CONTRATO.erroBaixar)
  }
}

function executarAcao(vinculo: FornecedorCasamentoDto, chave: string) {
  switch (chave as AcaoVinculo) {
    case 'editar':
      void roteador.push({ name: 'fornecedor-casamento-editar', params: { id: props.id, vinculoId: vinculo.id } })
      return
    case 'baixar':
      void baixar(vinculo)
      return
    case 'parcelas':
      irParaFinanceiro()
      return
    case 'remover':
      if (vinculo.parcelas && vinculo.parcelas.quantidade > 0) {
        vinculoComParcelas.value = vinculo
        return
      }
      vinculoRemocao.value = vinculo
  }
}

function irParaFinanceiro() {
  vinculoComParcelas.value = null
  void roteador.push({ name: 'casamento-financeiro', params: { id: props.id }, query: { visao: 'fornecedor' } })
}

function alterarVisibilidadeComParcelas(visivel: boolean) {
  if (!visivel) {
    vinculoComParcelas.value = null
  }
}

function alterarVisibilidadeRemocao(visivel: boolean) {
  if (!visivel && !removendo.value) {
    vinculoRemocao.value = null
  }
}

async function confirmarRemocao() {
  const vinculo = vinculoRemocao.value
  if (!vinculo) {
    return
  }
  removendo.value = true
  const resultado = await store.remover(props.id, vinculo.id)
  removendo.value = false
  vinculoRemocao.value = null
  if (!resultado.ok) {
    notificacao.erro(
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem
        ? resultado.falha.mensagem
        : TEXTOS_FORNECEDORES_CASAMENTO.erroRemover,
    )
    if (resultado.falha.tipo === 'naoEncontrado') {
      void store.carregar(props.id)
    }
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES_CASAMENTO.toastRemovido(vinculo.fornecedor.nomeEmpresa))
}

function aoImportar(resultado: ResultadoImportacaoFornecedoresDto) {
  notificacao.sucesso(TEXTOS_FORNECEDORES_CASAMENTO.importarResultado(resultado.importados, resultado.ignorados))
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="visaoDoCasal ? TEXTOS_FORNECEDORES_CASAMENTO.naoEncontradoCasalTitulo : TEXTOS_FORNECEDORES_CASAMENTO.naoEncontradoTitulo"
        :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="fornecedores-casamento__voltar"
        :to="autenticacao.casamentoDoCasal ? { name: 'casamento', params: { id: autenticacao.casamentoDoCasal } } : { name: 'casamentos' }"
        data-teste="voltar"
      >
        {{ autenticacao.casamentoDoCasal ? TEXTOS_FORNECEDORES_CASAMENTO.voltarNossoCasamento : TEXTOS_FORNECEDORES_CASAMENTO.voltarCasamentos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_FORNECEDORES_CASAMENTO.titulo"
        :descricao="descricao"
      >
        <template #trilha>
          <template v-if="!autenticacao.ehCasal">
            <RouterLink :to="{ name: 'casamentos' }">
              {{ TEXTOS_CASAMENTOS.listaTitulo }}
            </RouterLink>
            <span aria-hidden="true"> / </span>
          </template>
          <RouterLink :to="{ name: 'casamento', params: { id } }">
            {{ nomes || TEXTOS_CASAMENTOS.listaTitulo }}
          </RouterLink>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{{ TEXTOS_FORNECEDORES_CASAMENTO.titulo }}</span>
        </template>
        <template
          v-if="podeGerenciar && !falha && !semVinculos"
          #acoes
        >
          <Button
            :label="TEXTOS_FORNECEDORES_CASAMENTO.importar"
            icon="ie ie-importar"
            severity="secondary"
            outlined
            data-teste="importar-fornecedores"
            @click="importando = true"
          />
          <Button
            :label="TEXTOS_FORNECEDORES_CASAMENTO.adicionar"
            icon="ie ie-mais"
            data-teste="adicionar-fornecedor"
            @click="adicionar"
          />
        </template>
      </CabecalhoPagina>

      <div class="fornecedores-casamento pilha pilha--bloco">
        <MensagemFormulario
          v-if="arquivado && !visaoDoCasal"
          variante="alerta"
          :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.arquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !lista"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_FORNECEDORES_CASAMENTO.erroTitulo"
          :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_FORNECEDORES_CASAMENTO.erroTitulo"
          :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.erroTexto"
          @tentar-novamente="store.carregar(id)"
        />

        <EstadoVazio
          v-else-if="semVinculos"
          icone="fornecedor"
          :titulo="visaoDoCasal ? TEXTOS_FORNECEDORES_CASAMENTO.vazioCasalTitulo : TEXTOS_FORNECEDORES_CASAMENTO.vazioTitulo"
          :descricao="visaoDoCasal ? TEXTOS_FORNECEDORES_CASAMENTO.vazioCasalTexto : TEXTOS_FORNECEDORES_CASAMENTO.vazioTexto"
        >
          <template
            v-if="podeGerenciar"
            #acao
          >
            <div class="fornecedores-casamento__acoes-vazio">
              <Button
                :label="TEXTOS_FORNECEDORES_CASAMENTO.adicionar"
                icon="ie ie-mais"
                data-teste="adicionar-fornecedor-vazio"
                @click="adicionar"
              />
              <Button
                :label="TEXTOS_FORNECEDORES_CASAMENTO.importar"
                icon="ie ie-importar"
                severity="secondary"
                outlined
                data-teste="importar-fornecedores-vazio"
                @click="importando = true"
              />
            </div>
          </template>
        </EstadoVazio>

        <div
          v-else-if="lista"
          class="fornecedores-casamento__corpo"
        >
          <aside
            class="fornecedores-casamento__lateral"
            :aria-label="TEXTOS_RESUMO_ORCAMENTO.titulo"
            data-teste="lateral-orcamento"
          >
            <ResumoOrcamento :resumo="lista.resumo" />
          </aside>

          <div class="fornecedores-casamento__principal pilha pilha--bloco">
            <div
              class="fornecedores-casamento__grupos pilha pilha--cartao"
              data-teste="lista-vinculos"
            >
              <section
                v-for="grupo in grupos"
                :key="grupo.categoria"
                class="fornecedores-casamento__grupo pilha pilha--campo"
                :aria-labelledby="`grupo-vinculos-${grupo.categoria}`"
                :data-teste="`grupo-${grupo.categoria}`"
              >
                <h2
                  :id="`grupo-vinculos-${grupo.categoria}`"
                  class="fornecedores-casamento__titulo-grupo texto-rotulo"
                >
                  {{ ROTULOS_CATEGORIA_FORNECEDOR[grupo.categoria] }}
                  <span class="fornecedores-casamento__contagem">{{ TEXTOS_FORNECEDORES_CASAMENTO.quantidadeGrupo(grupo.vinculos.length) }}</span>
                </h2>
                <ul
                  class="fornecedores-casamento__lista cartao"
                  :aria-labelledby="`grupo-vinculos-${grupo.categoria}`"
                >
                  <LinhaFornecedorCasamento
                    v-for="vinculo in grupo.vinculos"
                    :key="vinculo.id"
                    :nome-empresa="vinculo.fornecedor.nomeEmpresa"
                    :status="vinculo.status"
                    :servico="vinculo.servico"
                    :valor-orcado="vinculo.valorOrcado"
                    :valor-contratado="vinculo.valorContratado"
                    :possui-contrato="vinculo.contrato !== null"
                    :destino="destinoEdicao(vinculo)"
                    :fornecedor-arquivado="vinculo.fornecedor.arquivado && !visaoDoCasal"
                    :telefone="vinculo.fornecedor.telefone"
                    :email="vinculo.fornecedor.email"
                    :site="vinculo.fornecedor.site"
                    :instagram="vinculo.fornecedor.instagram"
                    :parcelas="vinculo.parcelas ?? null"
                  >
                    <template
                      v-if="podeGerenciar"
                      #acoes
                    >
                      <MenuAcoes
                        :itens="acoesDoVinculo(vinculo)"
                        :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.maisAcoes"
                        :rotulo-acessivel="TEXTOS_FORNECEDORES_CASAMENTO.maisAcoesAria(vinculo.fornecedor.nomeEmpresa)"
                        :desabilitado="vinculoEmAndamento !== null"
                        somente-icone
                        @selecionar="executarAcao(vinculo, $event)"
                      />
                    </template>
                    <template
                      v-else-if="vinculo.contrato"
                      #acoes
                    >
                      <Button
                        :label="TEXTOS_FORNECEDORES_CASAMENTO.menuBaixar"
                        icon="ie ie-exportar"
                        severity="secondary"
                        text
                        :loading="vinculoEmAndamento === vinculo.id"
                        :aria-label="TEXTOS_CONTRATO.baixarAria(vinculo.fornecedor.nomeEmpresa, 'PDF')"
                        data-teste="baixar-contrato-linha"
                        @click="baixar(vinculo)"
                      />
                    </template>
                  </LinhaFornecedorCasamento>
                </ul>
              </section>
            </div>

            <p
              v-if="visaoDoCasal"
              class="fornecedores-casamento__rodape texto-legenda"
            >
              {{ TEXTOS_FORNECEDORES_CASAMENTO.rodapeCasal }}
            </p>
          </div>
        </div>
      </div>

      <DialogoImportarFornecedores
        v-if="podeGerenciar"
        v-model:visivel="importando"
        :casamento-id="id"
        @importado="aoImportar"
      />

      <DialogoConfirmacao
        :visivel="vinculoComParcelas !== null"
        :titulo="vinculoComParcelas ? TEXTOS_PARCELAS_FORNECEDOR.removerComParcelasTitulo(vinculoComParcelas.fornecedor.nomeEmpresa) : ''"
        :mensagem="TEXTOS_PARCELAS_FORNECEDOR.removerComParcelasTexto(vinculoComParcelas?.parcelas?.quantidade ?? 0)"
        :rotulo-confirmar="TEXTOS_PARCELAS_FORNECEDOR.irFinanceiro"
        :rotulo-cancelar="TEXTOS_FORNECEDORES_CASAMENTO.cancelar"
        data-teste="dialogo-vinculo-com-parcelas"
        @update:visivel="alterarVisibilidadeComParcelas"
        @confirmar="irParaFinanceiro"
      />

      <DialogoConfirmacao
        :visivel="vinculoRemocao !== null"
        :titulo="vinculoRemocao ? TEXTOS_FORNECEDORES_CASAMENTO.confirmarRemoverTitulo(vinculoRemocao.fornecedor.nomeEmpresa) : ''"
        :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.confirmarRemoverTexto"
        :rotulo-confirmar="TEXTOS_FORNECEDORES_CASAMENTO.confirmarRemover"
        :rotulo-cancelar="TEXTOS_FORNECEDORES_CASAMENTO.cancelar"
        :executando="removendo"
        perigoso
        @update:visivel="alterarVisibilidadeRemocao"
        @confirmar="confirmarRemocao"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.fornecedores-casamento {
  --fornecedores-casamento-largura-lateral: 22rem;

  container: fornecedores-casamento / inline-size;
}

.fornecedores-casamento__acoes-vazio {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--p-ritmo-campo);
}

.fornecedores-casamento__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'lateral'
    'principal';
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.fornecedores-casamento__lateral {
  grid-area: lateral;
  min-width: 0;
}

.fornecedores-casamento__principal {
  grid-area: principal;
  min-width: 0;
}

.fornecedores-casamento .fornecedores-casamento__titulo-grupo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.fornecedores-casamento__contagem {
  font-weight: var(--p-fonte-peso-regular);
  letter-spacing: normal;
  text-transform: none;
}

.fornecedores-casamento .fornecedores-casamento__lista {
  margin: 0;
  padding: 0;
  container: lista-vinculos / inline-size;
}

.fornecedores-casamento__rodape {
  margin: 0;
}

.fornecedores-casamento__voltar {
  display: inline-block;
  margin-top: var(--p-ritmo-grupo);
}

@container fornecedores-casamento (min-width: 64rem) {
  .fornecedores-casamento__corpo {
    grid-template-columns: minmax(0, 1fr) var(--fornecedores-casamento-largura-lateral);
    grid-template-areas: 'principal lateral';
  }

  .fornecedores-casamento__lateral {
    position: sticky;
    top: var(--p-ritmo-bloco);
  }
}
</style>
