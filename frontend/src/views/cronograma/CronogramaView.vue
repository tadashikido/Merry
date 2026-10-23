<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import LinhaCronograma from '@/componentes/base/LinhaCronograma.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import DialogoItemCronograma from '@/componentes/cronograma/DialogoItemCronograma.vue'
import DialogoSalvarModeloCronograma from '@/componentes/cronograma/DialogoSalvarModeloCronograma.vue'
import PainelAplicarModeloCronograma from '@/componentes/cronograma/PainelAplicarModeloCronograma.vue'
import EquipeRoteiroCronograma from '@/componentes/cronograma/EquipeRoteiroCronograma.vue'
import PainelLinksCronograma from '@/componentes/cronograma/PainelLinksCronograma.vue'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useDesfazerExclusao } from '@/composables/useDesfazerExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { useCronogramaStore } from '@/stores/cronograma'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { ROTULOS_DIA_CRONOGRAMA, TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { TEXTOS_LINKS_CRONOGRAMA } from '@/textos/cronogramaPublico'
import {
  TEXTOS_APLICAR_MODELO_CRONOGRAMA,
  TEXTOS_MODELOS_CRONOGRAMA,
  TEXTOS_RECALCULO_HORARIOS,
  TEXTOS_SALVAR_COMO_MODELO,
} from '@/textos/modelosCronograma'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { ItemCronogramaDto } from '@/tipos/cronograma'
import {
  agruparPorDia,
  contarSemResponsavel,
  descreverRelativoCerimonia,
  formatarDuracao,
  fornecedoresNoRoteiro,
  resumirDias,
  responsaveisUsados,
  rotuloLinha,
  textosConflitos,
} from '@/utilitarios/cronograma'
import { formatarDataCalendarioComDiaSemana, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const eventos = useEventosStore()
const store = useCronogramaStore()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()
const { desfazerExclusao } = useDesfazerExclusao()

const dialogoVisivel = ref(false)
const itemEmEdicao = ref<ItemCronogramaDto | null>(null)
const ultimoFocado = ref<string | null>(null)
const painelAplicar = ref(false)
const dialogoSalvarModelo = ref(false)
const dialogoRecalculo = ref(false)
const recalculando = ref(false)
const painelLinks = ref(false)
const origemLinks = ref<'cabecalho' | 'lateral'>('cabecalho')

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const vocabulario = computed(() => vocabularioOuNeutro(evento.value?.tipo))
const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const cronograma = computed(() => (store.eventoId === props.id ? store.cronograma : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))
const visaoDoAnfitriao = computed(() => autenticacao.ehAnfitriao)
const arquivado = computed(() => cronograma.value?.arquivado ?? evento.value?.arquivado ?? false)
const podeGerenciar = computed(() => cronograma.value !== null && !cronograma.value.somenteLeitura && !visaoDoAnfitriao.value)
const grupos = computed(() => agruparPorDia(cronograma.value?.itens ?? []))
const semItens = computed(() => cronograma.value !== null && cronograma.value.itens.length === 0)
const semHorarioCerimonia = computed(() => cronograma.value !== null && cronograma.value.horarioCerimonia === null)
const podeInformarHorario = computed(() => !visaoDoAnfitriao.value && !arquivado.value)
const podeSalvarModelo = computed(() => cronograma.value !== null && !visaoDoAnfitriao.value && cronograma.value.itens.length > 0)
const horariosDesatualizados = computed(() => (podeGerenciar.value ? (cronograma.value?.horariosDesatualizados ?? 0) : 0))
const podeCompartilhar = computed(() => cronograma.value !== null && !visaoDoAnfitriao.value)
const dadosMensagem = computed(() =>
  evento.value
    ? {
        nomePrimeiraPessoa: evento.value.nomePrimeiraPessoa,
        nomeSegundaPessoa: evento.value.nomeSegundaPessoa,
        data: evento.value.data,
      }
    : null,
)
const resumoDias = computed(() =>
  resumirDias(grupos.value).map((resumo) => ({
    dia: resumo.dia,
    rotulo: ROTULOS_DIA_CRONOGRAMA[resumo.dia],
    detalhe: `${TEXTOS_CRONOGRAMA.contagemGrupo(resumo.quantidade)}, ${resumo.intervalo}`,
    duracao: resumo.duracaoMinutos === null ? null : TEXTOS_CRONOGRAMA.resumoDuracao(formatarDuracao(resumo.duracaoMinutos)),
  })),
)
const fornecedoresEnvolvidos = computed(() => fornecedoresNoRoteiro(cronograma.value?.itens ?? []))
const responsaveisEnvolvidos = computed(() => responsaveisUsados(cronograma.value?.itens ?? []))
const semResponsavel = computed(() => (podeGerenciar.value ? contarSemResponsavel(cronograma.value?.itens ?? []) : 0))
const acoesMais: ItemMenuAcoes[] = [{ chave: 'salvar-modelo', rotulo: TEXTOS_SALVAR_COMO_MODELO.acao, icone: 'ie ie-lista' }]

const descricao = computed(() => {
  const dados = cronograma.value
  if (!dados) {
    return undefined
  }
  const data = formatarDataCalendarioComDiaSemana(dados.dataEvento)
  return dados.horarioCerimonia
    ? TEXTOS_CRONOGRAMA.subtituloCerimonia(data, dados.horarioCerimonia, vocabulario.value.momentoPrincipal)
    : TEXTOS_CRONOGRAMA.subtituloSemCerimonia(data, vocabulario.value.momento.contracaoDe)
})

watch(
  () => props.id,
  (id) => {
    painelAplicar.value = false
    painelLinks.value = false
    void eventos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_CRONOGRAMA.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

function tituloGrupo(dia: ItemCronogramaDto['dia'], data: string): string {
  return TEXTOS_CRONOGRAMA.grupo(dia, formatarDataCalendarioComDiaSemana(data))
}

function abrirNovo() {
  itemEmEdicao.value = null
  ultimoFocado.value = null
  dialogoVisivel.value = true
}

function abrirEdicao(item: ItemCronogramaDto) {
  itemEmEdicao.value = item
  ultimoFocado.value = item.id
  dialogoVisivel.value = true
}

function devolverFoco() {
  void nextTick(() => {
    const alvo = ultimoFocado.value
      ? document.querySelector<HTMLElement>(`[data-item-cronograma="${ultimoFocado.value}"] [data-teste="linha-cronograma-conteudo"]`)
      : document.querySelector<HTMLElement>('[data-teste="adicionar-item-cronograma"]')
    alvo?.focus()
  })
}

function aoSalvar(item: ItemCronogramaDto, mensagem: string) {
  ultimoFocado.value = item.id
  notificacao.sucesso(mensagem)
}

watch(painelLinks, (visivel) => {
  if (!visivel) {
    const alvo = origemLinks.value === 'lateral' ? 'abrir-links-lateral' : 'abrir-links-cronograma'
    void nextTick(() => document.querySelector<HTMLElement>(`[data-teste="${alvo}"]`)?.focus())
  }
})

function abrirLinks(origem: 'cabecalho' | 'lateral') {
  origemLinks.value = origem
  painelLinks.value = true
}

function relativoAoMomento(minutos: number | null): string | null {
  return descreverRelativoCerimonia(minutos, vocabulario.value.momento.contracaoDe)
}

watch(dialogoVisivel, (visivel) => {
  if (!visivel) {
    devolverFoco()
  }
})

function alternarPainelAplicar() {
  painelAplicar.value = !painelAplicar.value
}

function fecharPainelAplicar() {
  painelAplicar.value = false
  void nextTick(() => document.querySelector<HTMLElement>('[data-teste="abrir-aplicar-modelo"]')?.focus())
}

function executarAcaoMais(chave: string) {
  if (chave === 'salvar-modelo' && podeSalvarModelo.value) {
    dialogoSalvarModelo.value = true
  }
}

async function recalcularHorarios() {
  recalculando.value = true
  const resultado = await store.recalcular(props.id)
  recalculando.value = false
  dialogoRecalculo.value = false
  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_RECALCULO_HORARIOS.toast(resultado.valor.itens))
    return
  }
  notificacao.erro(
    resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_RECALCULO_HORARIOS.erro,
  )
}

function excluir(item: ItemCronogramaDto) {
  dialogoVisivel.value = false
  ultimoFocado.value = null
  const eventoId = props.id
  confirmarExclusao({
    nomeItem: item.atividade,
    mensagem: TEXTOS_CRONOGRAMA.confirmarExcluir,
    mensagemSucesso: TEXTOS_CRONOGRAMA.sucessoExcluido,
    aoConfirmar: () => {
      store.removerComDesfazer(eventoId, item.id, (falha) => {
        notificacao.erro(falha.mensagem ?? TEXTOS_CRONOGRAMA.erroExcluir(item.atividade))
      })
    },
    desfazer: () =>
      desfazerExclusao(() => store.desfazerRemocao(eventoId, item.id), TEXTOS_CRONOGRAMA.sucessoRestaurado(item.atividade)),
    aoFecharAviso: () => store.concluirRemocao(eventoId, item.id),
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_CRONOGRAMA.naoEncontradoTitulo"
        :mensagem="TEXTOS_CRONOGRAMA.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="cronograma__voltar"
        :to="autenticacao.eventoDoAnfitriao ? { name: 'evento', params: { id: autenticacao.eventoDoAnfitriao } } : { name: 'eventos' }"
        data-teste="voltar"
      >
        {{ autenticacao.eventoDoAnfitriao ? TEXTOS_CRONOGRAMA.voltarNossoEvento : TEXTOS_CRONOGRAMA.voltarEventos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_CRONOGRAMA.titulo"
        :descricao="descricao"
      >
        <template
          v-if="arquivado"
          #detalhes
        >
          <BadgeStatus
            :texto="TEXTOS_EVENTOS.statusArquivado"
            variante="neutro"
            icone="arquivar"
          />
        </template>
        <template
          v-if="(podeGerenciar && !semItens) || podeSalvarModelo || podeCompartilhar"
          #acoes
        >
          <Button
            v-if="podeCompartilhar"
            :label="TEXTOS_LINKS_CRONOGRAMA.acao"
            icon="ie ie-link"
            severity="secondary"
            outlined
            aria-haspopup="dialog"
            data-teste="abrir-links-cronograma"
            @click="abrirLinks('cabecalho')"
          />
          <Button
            v-if="podeGerenciar && !semItens"
            :label="TEXTOS_APLICAR_MODELO_CRONOGRAMA.acao"
            icon="ie ie-lista"
            severity="secondary"
            outlined
            :aria-expanded="painelAplicar"
            aria-controls="painel-aplicar-modelo-cronograma"
            data-teste="abrir-aplicar-modelo"
            @click="alternarPainelAplicar"
          />
          <MenuAcoes
            v-if="podeSalvarModelo"
            :itens="acoesMais"
            :rotulo="TEXTOS_MODELOS_CRONOGRAMA.maisAcoes"
            data-teste="mais-acoes-cronograma"
            @selecionar="executarAcaoMais"
          />
          <Button
            v-if="podeGerenciar && !semItens"
            :label="TEXTOS_CRONOGRAMA.acaoAdicionar"
            icon="ie ie-mais"
            class="cronograma__adicionar"
            data-teste="adicionar-item-cronograma"
            @click="abrirNovo"
          />
        </template>
      </CabecalhoPagina>

      <div class="cronograma pilha pilha--bloco">
        <MensagemFormulario
          v-if="arquivado"
          variante="alerta"
          :mensagem="TEXTOS_CRONOGRAMA.arquivado"
          data-teste="aviso-arquivado"
        />

        <MensagemFormulario
          v-if="semHorarioCerimonia"
          variante="alerta"
          :mensagem="vocabulario.faltaHorario"
          data-teste="aviso-sem-horario"
        >
          <p class="cronograma__aviso-texto">
            {{ TEXTOS_CRONOGRAMA.incompletoTexto }}
          </p>
          <RouterLink
            v-if="podeInformarHorario"
            :to="{ name: 'evento-editar', params: { id } }"
            data-teste="adicionar-horario"
          >
            {{ TEXTOS_CRONOGRAMA.incompletoAcao }}
          </RouterLink>
        </MensagemFormulario>

        <MensagemFormulario
          v-if="horariosDesatualizados > 0"
          variante="alerta"
          :mensagem="TEXTOS_RECALCULO_HORARIOS.faixa(horariosDesatualizados, vocabulario.momento.contracaoDe)"
          data-teste="aviso-horarios-desatualizados"
        >
          <Button
            :label="TEXTOS_RECALCULO_HORARIOS.recalcular"
            severity="secondary"
            outlined
            size="small"
            data-teste="abrir-recalculo-horarios"
            @click="dialogoRecalculo = true"
          />
        </MensagemFormulario>

        <PainelAplicarModeloCronograma
          v-if="painelAplicar && podeGerenciar"
          :evento-id="id"
          :pode-informar-horario="podeInformarHorario"
          :tipo-evento="evento?.tipo ?? null"
          @fechar="fecharPainelAplicar"
        />

        <EstadoCarregando
          v-if="store.carregando && !cronograma"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_CRONOGRAMA.erroTitulo"
          :mensagem="TEXTOS_CRONOGRAMA.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_CRONOGRAMA.erroTitulo"
          :mensagem="TEXTOS_CRONOGRAMA.erroTexto"
          @tentar-novamente="store.carregar(id)"
        />

        <EstadoVazio
          v-else-if="semItens && !painelAplicar"
          icone="cronograma"
          :titulo="podeGerenciar ? TEXTOS_CRONOGRAMA.vazioTitulo : TEXTOS_CRONOGRAMA.vazioAnfitriaoTitulo"
          :descricao="podeGerenciar ? TEXTOS_CRONOGRAMA.vazioTexto(vocabulario.momento.contracaoDe) : TEXTOS_CRONOGRAMA.vazioAnfitriaoTexto"
        >
          <template
            v-if="podeGerenciar"
            #acao
          >
            <div class="cronograma__acoes-vazio">
              <Button
                :label="TEXTOS_APLICAR_MODELO_CRONOGRAMA.acao"
                icon="ie ie-lista"
                :aria-expanded="painelAplicar"
                aria-controls="painel-aplicar-modelo-cronograma"
                data-teste="abrir-aplicar-modelo"
                @click="alternarPainelAplicar"
              />
              <Button
                :label="TEXTOS_CRONOGRAMA.acaoAdicionar"
                icon="ie ie-mais"
                severity="secondary"
                outlined
                data-teste="adicionar-item-cronograma"
                @click="abrirNovo"
              />
            </div>
          </template>
        </EstadoVazio>

        <div
          v-else-if="cronograma && !semItens"
          class="cronograma__corpo"
        >
          <div class="cronograma__principal pilha pilha--bloco">
            <MensagemFormulario
              v-if="cronograma.itensComConflito > 0"
              variante="alerta"
              :mensagem="TEXTOS_CRONOGRAMA.conflitosFaixa(cronograma.itensComConflito)"
              data-teste="aviso-conflitos"
            />

            <section
              v-for="grupo in grupos"
              :key="grupo.dia"
              class="cronograma__grupo pilha pilha--grupo"
              :aria-labelledby="`grupo-cronograma-${grupo.dia}`"
              :data-teste="`grupo-cronograma-${grupo.dia}`"
            >
              <div class="cronograma__cabeca-grupo">
                <h2
                  :id="`grupo-cronograma-${grupo.dia}`"
                  class="cronograma__titulo-grupo"
                >
                  {{ tituloGrupo(grupo.dia, grupo.data) }}
                </h2>
                <span class="cronograma__contagem texto-legenda">{{ TEXTOS_CRONOGRAMA.contagemGrupo(grupo.itens.length) }}</span>
              </div>
              <ol class="cronograma__lista cartao">
                <LinhaCronograma
                  v-for="item in grupo.itens"
                  :key="item.id"
                  :data-item-cronograma="item.id"
                  :inicio="item.inicio"
                  :termino="item.termino"
                  :termina-em-outro-dia="item.terminaEmOutroDia"
                  :atividade="item.atividade"
                  :local="item.local"
                  :responsavel="item.responsavel"
                  :fornecedor="item.fornecedor?.nomeEmpresa ?? null"
                  :instrucoes="item.instrucoes"
                  :possui-nota-interna="Boolean(item.notasInternas)"
                  :relativo-cerimonia="relativoAoMomento(item.minutosDesdeCerimonia)"
                  :eh-cerimonia="item.minutosDesdeCerimonia === 0"
                  :conflitos="textosConflitos(item)"
                  :editavel="podeGerenciar"
                  :rotulo="rotuloLinha(item)"
                  @editar="abrirEdicao(item)"
                />
              </ol>
            </section>
          </div>

          <aside
            class="cronograma__lateral pilha pilha--grupo"
            aria-labelledby="titulo-resumo-cronograma"
            data-teste="lateral-cronograma"
          >
            <div class="cronograma__resumo cartao pilha pilha--cartao">
              <h2
                id="titulo-resumo-cronograma"
                class="cronograma__titulo-resumo texto-rotulo"
              >
                {{ TEXTOS_CRONOGRAMA.resumoTitulo }}
              </h2>

              <div
                class="cronograma__cerimonia pilha pilha--campo"
                data-teste="resumo-cerimonia"
              >
                <span class="cronograma__rotulo-cerimonia">{{ vocabulario.horario }}</span>
                <span
                  v-if="cronograma.horarioCerimonia"
                  class="cronograma__horario-cerimonia"
                >{{ cronograma.horarioCerimonia }}</span>
                <span
                  v-else
                  class="cronograma__sem-horario texto-legenda"
                >{{ TEXTOS_CRONOGRAMA.resumoSemHorario }}</span>
              </div>

              <dl class="cronograma__dados">
                <div
                  v-if="cronograma.localCerimonia"
                  class="cronograma__dado"
                >
                  <dt>{{ vocabulario.locais.campoPrincipal }}</dt>
                  <dd>{{ cronograma.localCerimonia }}</dd>
                </div>
                <div
                  v-if="cronograma.localRecepcao"
                  class="cronograma__dado"
                >
                  <dt>{{ vocabulario.locais.campoSecundario }}</dt>
                  <dd>{{ cronograma.localRecepcao }}</dd>
                </div>
                <div class="cronograma__dado cronograma__dado--numero">
                  <dt>{{ TEXTOS_CRONOGRAMA.resumoItens }}</dt>
                  <dd
                    class="numeros-tabulares"
                    data-teste="resumo-total-itens"
                  >
                    {{ cronograma.itens.length.toLocaleString('pt-BR') }}
                  </dd>
                </div>
                <div
                  v-if="cronograma.itensComConflito > 0"
                  class="cronograma__dado cronograma__dado--numero cronograma__dado--alerta"
                >
                  <dt>{{ TEXTOS_CRONOGRAMA.resumoConflitos }}</dt>
                  <dd
                    class="numeros-tabulares"
                    data-teste="resumo-conflitos"
                  >
                    {{ cronograma.itensComConflito.toLocaleString('pt-BR') }}
                  </dd>
                </div>
                <div
                  v-if="semResponsavel > 0"
                  class="cronograma__dado cronograma__dado--numero"
                >
                  <dt>{{ TEXTOS_CRONOGRAMA.resumoSemResponsavel }}</dt>
                  <dd
                    class="numeros-tabulares"
                    data-teste="resumo-sem-responsavel"
                  >
                    {{ semResponsavel.toLocaleString('pt-BR') }}
                  </dd>
                </div>
              </dl>

              <div class="cronograma__dias pilha pilha--campo">
                <h3 class="cronograma__titulo-dias">
                  {{ TEXTOS_CRONOGRAMA.resumoDiasTitulo }}
                </h3>
                <ul class="cronograma__lista-dias">
                  <li
                    v-for="resumo in resumoDias"
                    :key="resumo.dia"
                    class="cronograma__dia"
                    :data-teste="`resumo-dia-${resumo.dia}`"
                  >
                    <span class="cronograma__dia-nome">{{ resumo.rotulo }}</span>
                    <span class="cronograma__dia-detalhe">{{ resumo.detalhe }}</span>
                    <span
                      v-if="resumo.duracao"
                      class="cronograma__dia-duracao"
                      data-teste="resumo-duracao"
                    >{{ resumo.duracao }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <EquipeRoteiroCronograma
              :fornecedores="fornecedoresEnvolvidos"
              :responsaveis="responsaveisEnvolvidos"
              :pode-compartilhar="podeCompartilhar"
              :orientar="podeGerenciar"
              @abrir-links="abrirLinks('lateral')"
            />

            <p
              v-if="visaoDoAnfitriao"
              class="cronograma__apoio texto-legenda"
              data-teste="apoio-anfitriao"
            >
              {{ TEXTOS_CRONOGRAMA.apoioAnfitriao }}
            </p>
          </aside>
        </div>
      </div>

      <DialogoItemCronograma
        v-if="cronograma && podeGerenciar"
        v-model:visivel="dialogoVisivel"
        :evento-id="id"
        :cronograma="cronograma"
        :item="itemEmEdicao"
        :tipo-evento="evento?.tipo ?? null"
        @salvo="aoSalvar"
        @excluir="excluir"
      />

      <PainelLinksCronograma
        v-if="podeCompartilhar"
        v-model:visivel="painelLinks"
        :evento-id="id"
        :evento="dadosMensagem"
      />

      <DialogoSalvarModeloCronograma
        v-if="cronograma && podeSalvarModelo"
        v-model:visivel="dialogoSalvarModelo"
        :evento-id="id"
        :horario-cerimonia="cronograma.horarioCerimonia"
        :tipo-evento="evento?.tipo ?? null"
      />

      <DialogoConfirmacao
        v-if="cronograma && podeGerenciar"
        v-model:visivel="dialogoRecalculo"
        :titulo="TEXTOS_RECALCULO_HORARIOS.titulo"
        :mensagem="
          TEXTOS_RECALCULO_HORARIOS.texto(
            horariosDesatualizados,
            cronograma.horarioCerimonia ?? '',
            vocabulario.momento.artigo,
            vocabulario.momento.contracaoDe,
          )
        "
        :rotulo-confirmar="TEXTOS_RECALCULO_HORARIOS.recalcular"
        :rotulo-cancelar="TEXTOS_RECALCULO_HORARIOS.manter"
        :executando="recalculando"
        data-teste="dialogo-recalculo-horarios"
        @confirmar="recalcularHorarios"
        @cancelar="dialogoRecalculo = false"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.cronograma {
  --cronograma-largura-lateral: 18rem;

  container: cronograma / inline-size;
}

.cronograma__aviso-texto {
  margin: 0;
}

.cronograma__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.cronograma__principal {
  min-width: 0;
}

.cronograma__cabeca-grupo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  align-items: baseline;
  justify-content: space-between;
}

.cronograma__titulo-grupo {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
  color: var(--p-cor-texto);
}

.cronograma__titulo-grupo::first-letter {
  text-transform: uppercase;
}

.cronograma__contagem {
  margin: 0;
}

.cronograma .cronograma__lista {
  margin: 0;
  padding: var(--p-ritmo-campo) var(--p-ritmo-campo) var(--p-ritmo-campo) 0;
}

.cronograma__lateral {
  min-width: 0;
  container: lateral-cronograma / inline-size;
}

.cronograma__titulo-resumo {
  margin: 0;
}

.cronograma__rotulo-cerimonia {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.cronograma__horario-cerimonia {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.cronograma__sem-horario {
  margin: 0;
}

.cronograma__dados {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding-top: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.cronograma__dado {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding-block: var(--p-ritmo-campo);
  font-size: var(--p-fonte-tamanho-controle);
}

.cronograma__dado--numero {
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-grupo);
}

.cronograma__dado dt {
  color: var(--p-cor-texto-secundario);
}

.cronograma__dado dd {
  margin: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.cronograma__dado--numero dd {
  font-weight: var(--p-fonte-peso-medio);
}

.cronograma__dado--alerta dt,
.cronograma__dado--alerta dd {
  color: var(--p-cor-alerta-texto);
}

.cronograma__dias {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.cronograma__titulo-dias {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.cronograma__lista-dias {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cronograma__dia {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-controle);
}

.cronograma__dia-nome {
  color: var(--p-cor-texto);
}

.cronograma__dia-detalhe {
  font-size: var(--p-fonte-tamanho-apoio);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-texto-apoio);
}

.cronograma__dia-duracao {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  font-variant-numeric: lining-nums tabular-nums;
  color: var(--p-cor-texto-secundario);
}

.cronograma__apoio {
  margin: 0;
}

.cronograma__acoes-vazio {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
  justify-content: center;
}

.cronograma__voltar {
  display: inline-block;
  margin-top: var(--p-ritmo-grupo);
}

@container lateral-cronograma (min-width: 36rem) {
  .cronograma__resumo {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto auto 1fr;
    column-gap: var(--p-ritmo-bloco);
  }

  .cronograma__resumo > .cronograma__titulo-resumo {
    grid-column: 1 / -1;
  }

  .cronograma__resumo > .cronograma__dias {
    grid-column: 2;
    grid-row: 2 / span 2;
    padding-top: 0;
    padding-left: var(--p-ritmo-bloco);
    border-top: 0;
    border-left: 1px solid var(--p-cor-divisoria);
  }
}

@container cronograma (min-width: 64rem) {
  .cronograma__corpo {
    grid-template-columns: minmax(0, 1fr) var(--cronograma-largura-lateral);
  }

  .cronograma__lateral {
    position: sticky;
    top: var(--p-ritmo-bloco);
  }
}
</style>
