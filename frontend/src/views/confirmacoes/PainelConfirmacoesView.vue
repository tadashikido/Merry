<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import BarraProgressoEnvio from '@/componentes/base/BarraProgressoEnvio.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import IndicadorPrazo from '@/componentes/base/IndicadorPrazo.vue'
import ListagemDados from '@/componentes/base/ListagemDados.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ResumoCardapio from '@/componentes/base/ResumoCardapio.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { ColunaListagem, LinhaCardapio } from '@/componentes/base/tipos'
import DialogoCobrancaPendentes from '@/componentes/confirmacoes/DialogoCobrancaPendentes.vue'
import ProximosPassosConfirmacoes from '@/componentes/confirmacoes/ProximosPassosConfirmacoes.vue'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEnvioConvite, type ConviteParaEnvio } from '@/composables/useEnvioConvite'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore } from '@/stores/eventos'
import { useConfirmacoesStore } from '@/stores/confirmacoes'
import { useRestricoesAlimentaresStore } from '@/stores/restricoesAlimentares'
import { TEXTOS_AREA_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { TEXTOS_COBRANCA, TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import { ROTULOS_STATUS_ENVIO } from '@/textos/convidados'
import { ROTULOS_TIPO_RESTRICAO, TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import { TEXTOS_ENVIO_CONVITE, VARIANTE_STATUS_ENVIO } from '@/textos/rsvp'
import type { ConvitePendenteDto } from '@/tipos/confirmacoes'
import { baixarTexto } from '@/utilitarios/arquivo'
import { gerarCsvBuffet, nomeArquivoBuffet } from '@/utilitarios/exportacaoBuffet'
import { formatarDataCalendarioComDiaSemana, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { filaCobranca, filtrarPendentes, segmentosEnvio, textoEstimativa } from '@/utilitarios/painelConfirmacoes'
import { itensResumoConvidados } from '@/utilitarios/resumoConvidados'

interface LinhaPendente extends Record<string, unknown> {
  id: string
  nome: string
  envio: string
  pendentes: string
  pendente: ConvitePendenteDto
}

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()

const eventos = useEventosStore()
const store = useConfirmacoesStore()
const restricoes = useRestricoesAlimentaresStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const busca = ref('')
const exportando = ref(false)
const cobrancaAberta = ref(false)

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const painel = computed(() => (store.eventoId === props.id ? store.painel : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))
const relatorio = computed(() => (restricoes.eventoId === props.id ? restricoes.relatorio : null))
const falhaRestricoes = computed(() => (restricoes.eventoId === props.id ? restricoes.falha : null))
const arquivado = computed(() => painel.value?.eventoArquivado ?? evento.value?.arquivado ?? false)

const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const descricao = computed(() =>
  evento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(evento.value.data)}` : undefined,
)

const semConvites = computed(() => painel.value !== null && painel.value.convites.total === 0)

const estimativa = computed(() =>
  painel.value ? textoEstimativa(painel.value.pessoas.pessoas, painel.value.convidadosEstimados) : null,
)

const segmentos = computed(() => (painel.value ? segmentosEnvio(painel.value.convites) : []))
const rotuloBarra = computed(() => {
  if (!painel.value) {
    return ''
  }
  const partes = segmentos.value.map((segmento) => `${segmento.valor} ${segmento.rotulo.toLowerCase()}`).join(', ')
  return TEXTOS_CONFIRMACOES.caminhoAcessivel(painel.value.convites.total, partes)
})

const linhasRestricoesAnfitriao = computed<LinhaCardapio[]>(() => {
  const total = painel.value?.pessoasComRestricaoAlimentar ?? 0
  return total > 0 ? [{ chave: 'total', rotulo: TEXTOS_AREA_ANFITRIAO.restricoesRotulo, valor: total }] : []
})

const linhasCardapio = computed<LinhaCardapio[]>(() => {
  const atual = relatorio.value
  if (!atual) {
    return []
  }
  const linhas: LinhaCardapio[] = atual.porTipo.map((contagem) => ({
    chave: contagem.tipo,
    rotulo: ROTULOS_TIPO_RESTRICAO[contagem.tipo] ?? contagem.tipo,
    valor: contagem.quantidade,
  }))
  if (atual.outrasRestricoes > 0) {
    linhas.push({ chave: 'outras', rotulo: TEXTOS_DADOS_SENSIVEIS.outrasRestricoes, valor: atual.outrasRestricoes })
  }
  if (atual.necessidadesEspeciais > 0) {
    linhas.push({ chave: 'necessidades', rotulo: TEXTOS_DADOS_SENSIVEIS.necessidadesEspeciais, valor: atual.necessidadesEspeciais })
  }
  return linhas
})

const linhasPendentes = computed<LinhaPendente[]>(() =>
  filtrarPendentes(painel.value?.pendentes ?? [], busca.value).map((pendente) => ({
    id: pendente.conviteId,
    nome: pendente.nome,
    envio: pendente.statusEnvio,
    pendentes: pendente.pessoasPendentes.join(', '),
    pendente,
  })),
)

const colunasPendentes: ColunaListagem<LinhaPendente>[] = [
  { campo: 'nome', titulo: TEXTOS_CONFIRMACOES.colunaConvite, principal: true },
  { campo: 'envio', titulo: TEXTOS_CONFIRMACOES.colunaEnvio, largura: '10rem' },
]

const mensagemErro = computed(() => {
  if (!falha.value || falha.value.tipo === 'naoEncontrado') {
    return null
  }
  return falha.value.tipo === 'semPermissao' ? TEXTOS_CONFIRMACOES.semAcesso : TEXTOS_CONFIRMACOES.erroCarregar
})

async function recarregar() {
  await store.carregar(props.id)
}

const envio = useEnvioConvite({
  eventoId: () => props.id,
  evento: () => evento.value,
  arquivado: () => arquivado.value,
  aoAlterar: recarregar,
})
const { conviteEmAndamento, confirmacaoLink, executandoConfirmacao, itensMenuLink, anuncioCobranca } = envio

const fila = computed(() => filaCobranca(painel.value?.pendentes ?? []))
const prazoEncerrado = computed(() => painel.value !== null && !painel.value.prazo.aceitaRespostas)
const podeCobrar = computed(() => !arquivado.value && !prazoEncerrado.value && fila.value.length > 0)

function paraEnvio(pendente: ConvitePendenteDto): ConviteParaEnvio {
  return { id: pendente.conviteId, nome: pendente.nome, statusEnvio: pendente.statusEnvio, telefone: pendente.telefone }
}

watch(
  () => props.id,
  (id) => {
    busca.value = ''
    cobrancaAberta.value = false
    void eventos.obter(id)
    void store.carregar(id)
    if (!autenticacao.ehAnfitriao) {
      void restricoes.carregar(id)
    }
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_CONFIRMACOES.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

async function baixarPlanilha() {
  exportando.value = true
  try {
    const resultado = await store.exportar(props.id, 'csv')
    if (!resultado.ok) {
      notificacao.erro(resultado.falha.tipo === 'semPermissao' ? TEXTOS_CONFIRMACOES.semAcessoExportar : TEXTOS_CONFIRMACOES.erroExportar)
      return
    }
    baixarTexto(nomeArquivoBuffet(resultado.valor), gerarCsvBuffet(resultado.valor))
    notificacao.sucesso(TEXTOS_CONFIRMACOES.csvBaixado)
  } finally {
    exportando.value = false
  }
}

function abrirImpressao() {
  const destino = roteador.resolve({ name: 'impressao-buffet', params: { id: props.id } })
  const janela = window.open(destino.href, '_blank')
  if (janela) {
    janela.opener = null
    return
  }
  void roteador.push(destino)
}

function alterarPrazo() {
  void roteador.push({ name: 'evento-editar', params: { id: props.id } })
}

function adicionar() {
  void roteador.push({ name: 'convite-novo', params: { id: props.id } })
}

function importar() {
  void roteador.push({ name: 'convidados-importar', params: { id: props.id } })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div
      v-if="falha?.tipo === 'naoEncontrado'"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        :titulo="TEXTOS_CONFIRMACOES.naoEncontradoTitulo"
        :mensagem="TEXTOS_CONFIRMACOES.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="confirmacoes__voltar"
        :to="{ name: 'eventos' }"
        data-teste="voltar-eventos"
      >
        {{ TEXTOS_CONFIRMACOES.voltarEventos }}
      </RouterLink>
    </div>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_CONFIRMACOES.titulo"
        :descricao="descricao"
      >
        <template #acoes>
          <template v-if="painel && !semConvites && !autenticacao.ehAnfitriao">
            <Button
              :label="TEXTOS_CONFIRMACOES.exportarImpressao"
              icon="ie ie-imprimir"
              severity="secondary"
              outlined
              data-teste="abrir-impressao"
              @click="abrirImpressao"
            />
            <Button
              :label="TEXTOS_CONFIRMACOES.exportarCsv"
              icon="ie ie-exportar"
              :loading="exportando"
              data-teste="baixar-planilha"
              @click="baixarPlanilha"
            />
          </template>
        </template>
      </CabecalhoPagina>

      <div class="confirmacoes pilha pilha--bloco">
        <MensagemFormulario
          v-if="arquivado"
          variante="informacao"
          :mensagem="TEXTOS_CONFIRMACOES.avisoArquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !painel"
          variante="cartao"
          :linhas="2"
        />

        <EstadoErro
          v-else-if="mensagemErro"
          :titulo="TEXTOS_CONFIRMACOES.erroCarregar"
          :mensagem="mensagemErro"
          :pode-tentar-novamente="falha?.tipo !== 'semPermissao'"
          @tentar-novamente="recarregar"
        />

        <div
          v-else-if="semConvites"
          class="confirmacoes__vazio"
          data-teste="painel-vazio"
        >
          <EstadoVazio
            :titulo="TEXTOS_CONFIRMACOES.vazioTitulo"
            :descricao="TEXTOS_CONFIRMACOES.vazioTexto"
            icone="email"
          >
            <template
              v-if="!arquivado"
              #acao
            >
              <Button
                :label="TEXTOS_CONFIRMACOES.adicionarConvite"
                icon="ie ie-mais"
                severity="secondary"
                outlined
                @click="adicionar"
              />
              <Button
                :label="TEXTOS_CONFIRMACOES.importarPlanilha"
                icon="ie ie-importar"
                severity="secondary"
                text
                @click="importar"
              />
            </template>
          </EstadoVazio>
        </div>

        <template v-else-if="painel">
          <IndicadorPrazo
            :data-limite="painel.prazo.dataLimite"
            :dias-restantes="painel.prazo.diasRestantes"
            :aceita-respostas="painel.prazo.aceitaRespostas"
          >
            <template
              v-if="!arquivado && !autenticacao.ehAnfitriao"
              #acao
            >
              <Button
                :label="TEXTOS_CONFIRMACOES.alterarPrazo"
                severity="secondary"
                text
                data-teste="alterar-prazo"
                @click="alterarPrazo"
              />
            </template>
          </IndicadorPrazo>

          <ResumoContagem
            :itens="itensResumoConvidados(painel.pessoas)"
            :rotulo="TEXTOS_CONFIRMACOES.pessoasRotulo"
            variante="indicadores"
          >
            <template
              v-if="estimativa"
              #rodape
            >
              <span data-teste="comparacao-estimativa">{{ estimativa }}</span>
            </template>
          </ResumoContagem>

          <div
            class="confirmacoes__detalhes"
            data-teste="detalhes-confirmacoes"
          >
            <BarraProgressoEnvio
              :titulo="TEXTOS_CONFIRMACOES.caminhoTitulo"
              :segmentos="segmentos"
              :rotulo-acessivel="rotuloBarra"
              :vazio="TEXTOS_CONFIRMACOES.semConvitesBarra"
            >
              <template #rodape>
                <span data-teste="respondidos">{{ TEXTOS_CONFIRMACOES.respondidos(painel.convites.respondidos, painel.convites.aguardandoResposta) }}</span>
              </template>
            </BarraProgressoEnvio>

            <div
              v-if="autenticacao.ehAnfitriao"
              class="confirmacoes__restricoes"
              data-teste="restricoes-anfitriao"
            >
              <ResumoCardapio
                :titulo="TEXTOS_AREA_ANFITRIAO.restricoesTitulo"
                :linhas="linhasRestricoesAnfitriao"
                :vazio="TEXTOS_AREA_ANFITRIAO.restricoesVazio"
              >
                <template #rodape>
                  <span>{{ TEXTOS_AREA_ANFITRIAO.restricoesApoio }}</span>
                </template>
              </ResumoCardapio>
            </div>
            <div
              v-else-if="!falhaRestricoes || falhaRestricoes.tipo !== 'semPermissao'"
              class="confirmacoes__restricoes"
            >
              <EstadoCarregando
                v-if="restricoes.carregando && !relatorio"
                variante="cartao"
                :linhas="1"
              />
              <div
                v-else-if="falhaRestricoes"
                class="confirmacoes__erro-bloco"
                role="alert"
                data-teste="erro-restricoes"
              >
                <p>{{ TEXTOS_CONFIRMACOES.erroRestricoes }}</p>
                <Button
                  :label="ROTULOS_ACOES.tentarNovamente"
                  severity="secondary"
                  text
                  @click="restricoes.carregar(id)"
                />
              </div>
              <ResumoCardapio
                v-else-if="relatorio"
                :titulo="TEXTOS_DADOS_SENSIVEIS.resumoBuffet"
                :linhas="linhasCardapio"
                :vazio="TEXTOS_CONFIRMACOES.semRestricoes"
              >
                <template #rodape>
                  <RouterLink
                    :to="{ name: 'restricoes-alimentares', params: { id } }"
                    data-teste="ver-restricoes"
                  >
                    {{ TEXTOS_CONFIRMACOES.verRestricoes }}
                  </RouterLink>
                </template>
              </ResumoCardapio>
            </div>
          </div>

          <div class="confirmacoes__corpo">
            <section
              class="confirmacoes__pendentes pilha pilha--cartao"
              aria-labelledby="titulo-pendentes"
            >
              <div class="confirmacoes__cabecalho-pendentes cabecalho-secao">
                <div>
                  <h2
                    id="titulo-pendentes"
                    class="confirmacoes__titulo-secao"
                  >
                    {{ TEXTOS_CONFIRMACOES.pendentesTitulo }}
                    <span class="confirmacoes__quantidade numeros-tabulares">({{ painel.pendentes.length }})</span>
                  </h2>
                </div>

                <div
                  v-if="podeCobrar"
                  class="confirmacoes__cobrar"
                >
                  <Button
                    :label="TEXTOS_COBRANCA.acaoAbrir(fila.length)"
                    icon="ie ie-mensagem"
                    severity="secondary"
                    outlined
                    aria-haspopup="dialog"
                    data-teste="abrir-cobranca"
                    @click="cobrancaAberta = true"
                  />
                </div>
                <p
                  v-else-if="prazoEncerrado && !arquivado && painel.pendentes.length > 0"
                  class="confirmacoes__aviso-cobranca"
                  data-teste="cobranca-prazo-encerrado"
                >
                  {{ TEXTOS_COBRANCA.prazoEncerrado }}
                </p>
              </div>

              <MensagemFormulario
                v-if="painel.pendentes.length === 0"
                variante="sucesso"
                :mensagem="TEXTOS_CONFIRMACOES.pendentesVazio"
                data-teste="pendentes-vazio"
              />

              <ListagemDados
                v-else
                v-model:busca="busca"
                :itens="linhasPendentes"
                :colunas="colunasPendentes"
                chave="id"
                :rotulo="TEXTOS_CONFIRMACOES.pendentesRotulo"
                :placeholder-busca="TEXTOS_CONFIRMACOES.buscaPendentes"
                acoes-somente-icone-abaixo="larga"
              >
                <template #celula-nome="{ item }">
                  <div
                    class="confirmacoes__convite"
                    data-teste="pendente"
                  >
                    <span class="confirmacoes__nome-convite">{{ item.nome }}</span>
                    <span class="confirmacoes__pessoas">{{ item.pendentes }}</span>
                    <span class="confirmacoes__contagem-pessoas numeros-tabulares">
                      {{ TEXTOS_CONFIRMACOES.pessoasPendentes(item.pendente.pessoasPendentes.length, item.pendente.totalPessoas) }}
                    </span>
                  </div>
                </template>

                <template #celula-envio="{ item }">
                  <BadgeStatus
                    :texto="ROTULOS_STATUS_ENVIO[item.pendente.statusEnvio]"
                    :variante="VARIANTE_STATUS_ENVIO[item.pendente.statusEnvio]"
                  />
                </template>

                <template #acoes-linha="{ item }">
                  <Button
                    v-if="!arquivado"
                    :label="TEXTOS_ENVIO_CONVITE.enviarWhatsApp"
                    :aria-label="TEXTOS_ENVIO_CONVITE.acaoComNome(TEXTOS_ENVIO_CONVITE.enviarWhatsApp, item.nome)"
                    :title="TEXTOS_ENVIO_CONVITE.enviarWhatsApp"
                    icon="ie ie-whatsapp"
                    severity="secondary"
                    outlined
                    :loading="conviteEmAndamento === item.id"
                    :disabled="conviteEmAndamento !== null && conviteEmAndamento !== item.id"
                    data-teste="enviar-whatsapp"
                    @click="envio.enviarWhatsApp(paraEnvio(item.pendente))"
                  />
                  <MenuAcoes
                    :itens="itensMenuLink()"
                    :rotulo="TEXTOS_ENVIO_CONVITE.maisAcoes"
                    :rotulo-acessivel="TEXTOS_ENVIO_CONVITE.acaoComNome(TEXTOS_ENVIO_CONVITE.maisAcoes, item.nome)"
                    :desabilitado="conviteEmAndamento !== null"
                    compactavel
                    @selecionar="envio.executarAcaoLink(paraEnvio(item.pendente), $event)"
                  />
                </template>
              </ListagemDados>
            </section>

            <div class="confirmacoes__passos">
              <ProximosPassosConfirmacoes
                :painel="painel"
                :tipo="evento?.tipo ?? null"
                :data-evento="evento?.data ?? null"
                :arquivado="arquivado"
                :evento-id="id"
              />
            </div>
          </div>
        </template>
      </div>

      <DialogoCobrancaPendentes
        v-model:visivel="cobrancaAberta"
        :fila="fila"
        :evento="evento"
        :convite-em-andamento="conviteEmAndamento"
        :anuncio="anuncioCobranca"
        @whatsapp="envio.enviarLembreteWhatsApp(paraEnvio($event))"
        @copiar="envio.copiarLembrete(paraEnvio($event))"
        @registrar="envio.registrarCobranca(paraEnvio($event))"
      />

      <DialogoConfirmacao
        :visivel="confirmacaoLink !== null"
        :titulo="confirmacaoLink?.acao === 'revogar' ? TEXTOS_ENVIO_CONVITE.confirmarRevogarTitulo : TEXTOS_ENVIO_CONVITE.confirmarRegenerarTitulo"
        :mensagem="confirmacaoLink?.acao === 'revogar'
          ? TEXTOS_ENVIO_CONVITE.confirmarRevogarTexto
          : TEXTOS_ENVIO_CONVITE.confirmarRegenerarTexto(confirmacaoLink?.convite.nome ?? '')"
        :rotulo-confirmar="confirmacaoLink?.acao === 'revogar' ? TEXTOS_ENVIO_CONVITE.confirmarRevogarAcao : TEXTOS_ENVIO_CONVITE.confirmarRegenerarAcao"
        :rotulo-cancelar="TEXTOS_ENVIO_CONVITE.cancelar"
        :executando="executandoConfirmacao"
        @confirmar="envio.confirmarAcaoLink"
        @cancelar="envio.cancelarConfirmacao"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.confirmacoes {
  --confirmacoes-coluna-minima: 22rem;

  container: confirmacoes / inline-size;
}

.confirmacoes__corpo {
  --confirmacoes-largura-lateral: 21rem;

  display: grid;
  grid-template-areas:
    'pendentes'
    'passos';
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.confirmacoes__passos {
  display: grid;
  grid-area: passos;
  min-width: 0;
}

.confirmacoes__pendentes {
  container: confirmacoes-lista / inline-size;
  grid-area: pendentes;
  min-width: 0;
}

.confirmacoes :deep(.resumo-contagem--indicadores .resumo-contagem__itens.grade) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.confirmacoes__vazio {
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.confirmacoes__detalhes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(var(--confirmacoes-coluna-minima), 100%), 1fr));
  gap: var(--p-ritmo-cartao);
}

.confirmacoes__restricoes {
  display: grid;
  min-width: 0;
}

.confirmacoes__restricoes :deep(.resumo-cardapio) {
  max-width: none;
}

.confirmacoes__erro-bloco {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-ritmo-campo);
  padding: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-left: 4px solid var(--p-cor-erro);
  border-radius: var(--p-raio-painel);
}

.confirmacoes__cabecalho-pendentes {
  align-items: center;
}

.confirmacoes__cobrar {
  display: flex;
}

.confirmacoes__aviso-cobranca {
  max-width: var(--p-dimensao-largura-leitura);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.confirmacoes__quantidade {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.confirmacoes__convite {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.confirmacoes__nome-convite {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.confirmacoes__pessoas {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.confirmacoes__contagem-pessoas {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

@container confirmacoes (max-width: 39.99rem) {
  .confirmacoes__cobrar {
    flex: 1 1 100%;
  }

  .confirmacoes__cobrar > * {
    flex: 1 1 100%;
  }
}

@container confirmacoes (min-width: 48rem) {
  .confirmacoes :deep(.resumo-contagem--indicadores .resumo-contagem__itens.grade) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container confirmacoes (min-width: 64rem) {
  .confirmacoes__corpo {
    grid-template-areas: 'pendentes passos';
    grid-template-columns: minmax(0, 1fr) var(--confirmacoes-largura-lateral);
  }
}
</style>
