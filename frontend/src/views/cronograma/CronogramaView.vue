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
import PainelLinksCronograma from '@/componentes/cronograma/PainelLinksCronograma.vue'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useCronogramaStore } from '@/stores/cronograma'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { TEXTOS_LINKS_CRONOGRAMA } from '@/textos/cronogramaPublico'
import {
  TEXTOS_APLICAR_MODELO_CRONOGRAMA,
  TEXTOS_MODELOS_CRONOGRAMA,
  TEXTOS_RECALCULO_HORARIOS,
  TEXTOS_SALVAR_COMO_MODELO,
} from '@/textos/modelosCronograma'
import type { ItemCronogramaDto } from '@/tipos/cronograma'
import { agruparPorDia, descreverRelativoCerimonia, rotuloLinha, textosConflitos } from '@/utilitarios/cronograma'
import { formatarDataCalendarioComDiaSemana, formatarNomesCasal } from '@/utilitarios/formatacao'

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const store = useCronogramaStore()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const dialogoVisivel = ref(false)
const itemEmEdicao = ref<ItemCronogramaDto | null>(null)
const ultimoFocado = ref<string | null>(null)
const painelAplicar = ref(false)
const dialogoSalvarModelo = ref(false)
const dialogoRecalculo = ref(false)
const recalculando = ref(false)
const painelLinks = ref(false)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const cronograma = computed(() => (store.casamentoId === props.id ? store.cronograma : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const visaoDoCasal = computed(() => autenticacao.ehCasal)
const arquivado = computed(() => cronograma.value?.arquivado ?? casamento.value?.arquivado ?? false)
const podeGerenciar = computed(() => cronograma.value !== null && !cronograma.value.somenteLeitura && !visaoDoCasal.value)
const grupos = computed(() => agruparPorDia(cronograma.value?.itens ?? []))
const semItens = computed(() => cronograma.value !== null && cronograma.value.itens.length === 0)
const semHorarioCerimonia = computed(() => cronograma.value !== null && cronograma.value.horarioCerimonia === null)
const podeInformarHorario = computed(() => !visaoDoCasal.value && !arquivado.value)
const podeSalvarModelo = computed(() => cronograma.value !== null && !visaoDoCasal.value && cronograma.value.itens.length > 0)
const horariosDesatualizados = computed(() => (podeGerenciar.value ? (cronograma.value?.horariosDesatualizados ?? 0) : 0))
const podeCompartilhar = computed(() => cronograma.value !== null && !visaoDoCasal.value)
const dadosMensagem = computed(() =>
  casamento.value
    ? {
        nomePrimeiraPessoa: casamento.value.nomePrimeiraPessoa,
        nomeSegundaPessoa: casamento.value.nomeSegundaPessoa,
        data: casamento.value.data,
      }
    : null,
)
const acoesMais: ItemMenuAcoes[] = [{ chave: 'salvar-modelo', rotulo: TEXTOS_SALVAR_COMO_MODELO.acao, icone: 'ie ie-lista' }]

const descricao = computed(() => {
  const dados = cronograma.value
  if (!dados) {
    return undefined
  }
  const data = formatarDataCalendarioComDiaSemana(dados.dataCasamento)
  return dados.horarioCerimonia
    ? TEXTOS_CRONOGRAMA.subtituloCerimonia(data, dados.horarioCerimonia)
    : TEXTOS_CRONOGRAMA.subtituloSemCerimonia(data)
})

watch(
  () => props.id,
  (id) => {
    painelAplicar.value = false
    painelLinks.value = false
    void casamentos.obter(id)
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
    void nextTick(() => document.querySelector<HTMLElement>('[data-teste="abrir-links-cronograma"]')?.focus())
  }
})

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
  confirmarExclusao({
    nomeItem: item.atividade,
    mensagem: TEXTOS_CRONOGRAMA.confirmarExcluir,
    mensagemSucesso: TEXTOS_CRONOGRAMA.sucessoExcluido,
    aoConfirmar: async () => {
      const resultado = await store.remover(props.id, item.id)
      if (!resultado.ok) {
        notificacao.erro(resultado.falha.mensagem ?? TEXTOS_CRONOGRAMA.erroSalvar)
        throw new Error(resultado.falha.mensagem ?? resultado.falha.tipo)
      }
    },
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
        :to="autenticacao.casamentoDoCasal ? { name: 'casamento', params: { id: autenticacao.casamentoDoCasal } } : { name: 'casamentos' }"
        data-teste="voltar"
      >
        {{ autenticacao.casamentoDoCasal ? TEXTOS_CRONOGRAMA.voltarNossoCasamento : TEXTOS_CRONOGRAMA.voltarCasamentos }}
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
            :texto="TEXTOS_CASAMENTOS.statusArquivado"
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
            @click="painelLinks = true"
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

      <div class="cronograma">
        <MensagemFormulario
          v-if="arquivado"
          variante="alerta"
          :mensagem="TEXTOS_CRONOGRAMA.arquivado"
          data-teste="aviso-arquivado"
        />

        <MensagemFormulario
          v-if="semHorarioCerimonia"
          variante="alerta"
          :mensagem="TEXTOS_CRONOGRAMA.incompletoTitulo"
          data-teste="aviso-sem-horario"
        >
          <p class="cronograma__aviso-texto">
            {{ TEXTOS_CRONOGRAMA.incompletoTexto }}
          </p>
          <RouterLink
            v-if="podeInformarHorario"
            :to="{ name: 'casamento-editar', params: { id } }"
            data-teste="adicionar-horario"
          >
            {{ TEXTOS_CRONOGRAMA.incompletoAcao }}
          </RouterLink>
        </MensagemFormulario>

        <MensagemFormulario
          v-if="horariosDesatualizados > 0"
          variante="alerta"
          :mensagem="TEXTOS_RECALCULO_HORARIOS.faixa(horariosDesatualizados)"
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
          :casamento-id="id"
          :pode-informar-horario="podeInformarHorario"
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
          :titulo="podeGerenciar ? TEXTOS_CRONOGRAMA.vazioTitulo : TEXTOS_CRONOGRAMA.vazioCasalTitulo"
          :descricao="podeGerenciar ? TEXTOS_CRONOGRAMA.vazioTexto : TEXTOS_CRONOGRAMA.vazioCasalTexto"
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

        <template v-else-if="cronograma && !semItens">
          <MensagemFormulario
            v-if="cronograma.itensComConflito > 0"
            variante="alerta"
            :mensagem="TEXTOS_CRONOGRAMA.conflitosFaixa(cronograma.itensComConflito)"
            data-teste="aviso-conflitos"
          />

          <section
            v-for="grupo in grupos"
            :key="grupo.dia"
            class="cronograma__grupo"
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
              <span class="cronograma__contagem">{{ TEXTOS_CRONOGRAMA.contagemGrupo(grupo.itens.length) }}</span>
            </div>
            <ol class="cronograma__lista">
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
                :relativo-cerimonia="descreverRelativoCerimonia(item.minutosDesdeCerimonia)"
                :eh-cerimonia="item.minutosDesdeCerimonia === 0"
                :conflitos="textosConflitos(item)"
                :editavel="podeGerenciar"
                :rotulo="rotuloLinha(item)"
                @editar="abrirEdicao(item)"
              />
            </ol>
          </section>

          <p
            v-if="visaoDoCasal"
            class="cronograma__apoio"
            data-teste="apoio-casal"
          >
            {{ TEXTOS_CRONOGRAMA.apoioCasal }}
          </p>
        </template>
      </div>

      <DialogoItemCronograma
        v-if="cronograma && podeGerenciar"
        v-model:visivel="dialogoVisivel"
        :casamento-id="id"
        :cronograma="cronograma"
        :item="itemEmEdicao"
        @salvo="aoSalvar"
        @excluir="excluir"
      />

      <PainelLinksCronograma
        v-if="podeCompartilhar"
        v-model:visivel="painelLinks"
        :casamento-id="id"
        :casamento="dadosMensagem"
      />

      <DialogoSalvarModeloCronograma
        v-if="cronograma && podeSalvarModelo"
        v-model:visivel="dialogoSalvarModelo"
        :casamento-id="id"
        :horario-cerimonia="cronograma.horarioCerimonia"
      />

      <DialogoConfirmacao
        v-if="cronograma && podeGerenciar"
        v-model:visivel="dialogoRecalculo"
        :titulo="TEXTOS_RECALCULO_HORARIOS.titulo"
        :mensagem="TEXTOS_RECALCULO_HORARIOS.texto(horariosDesatualizados, cronograma.horarioCerimonia ?? '')"
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
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  max-width: var(--p-dimensao-largura-leitura);
}

.cronograma__aviso-texto {
  margin: 0;
}

.cronograma__grupo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.cronograma__cabeca-grupo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2) var(--p-espaco-4);
  align-items: baseline;
  justify-content: space-between;
}

.cronograma__titulo-grupo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.cronograma__titulo-grupo::first-letter {
  text-transform: uppercase;
}

.cronograma__contagem {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.cronograma__lista {
  margin: 0;
  padding: 0 var(--p-espaco-2) 0 0;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.cronograma__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.cronograma__acoes-vazio {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
  justify-content: center;
}

.cronograma__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}

@media (max-width: 639px) {
  .cronograma__adicionar {
    width: 100%;
  }
}
</style>
