<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ListaDetalhes from '@/componentes/base/ListaDetalhes.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import NomesCasal from '@/componentes/base/NomesCasal.vue'
import BlocoAcessoCasal from '@/componentes/acessoCasal/BlocoAcessoCasal.vue'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import BlocoConvidados from '@/componentes/convidados/BlocoConvidados.vue'
import BlocoProximosPassos from '@/componentes/casamentos/BlocoProximosPassos.vue'
import type { ItemDetalhe } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_AREA_CASAL } from '@/textos/acessoCasal'
import { ROTULOS_FASE, TEXTOS_CASAMENTOS, VARIANTE_FASE } from '@/textos/casamentos'
import { TEXTOS_DUPLICACAO_CASAMENTO } from '@/textos/duplicacaoCasamento'
import {
  formatarDataCalendarioComDiaSemana,
  formatarDataCalendarioExtenso,
  formatarNomesCasal,
  formatarNumero,
} from '@/utilitarios/formatacao'

const props = defineProps<{ id: string }>()

const store = useCasamentosStore()
const financeiro = useFinanceiroStore()
const autenticacao = useAutenticacaoStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const processando = ref(false)

const casamento = computed(() => (store.atual?.id === props.id ? store.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)

const quando = computed(() => {
  if (!casamento.value) {
    return ''
  }
  const data = formatarDataCalendarioComDiaSemana(casamento.value.data)
  return casamento.value.horario ? `${data}, ${casamento.value.horario}` : data
})

const podeEditar = computed(() => !autenticacao.ehCasal && Boolean(casamento.value && !casamento.value.arquivado))

const dadosFaltantes = computed(() => {
  const atual = casamento.value
  if (!atual || !podeEditar.value) {
    return []
  }
  return [
    ...(atual.horario ? [] : [TEXTOS_CASAMENTOS.faltaHorario]),
    ...(atual.localCerimonia ? [] : [TEXTOS_CASAMENTOS.faltaLocal]),
  ]
})

const detalhes = computed<ItemDetalhe[]>(() => {
  const atual = casamento.value
  if (!atual) {
    return []
  }
  return [
    { rotulo: TEXTOS_CASAMENTOS.data, valor: formatarDataCalendarioExtenso(atual.data) },
    { rotulo: TEXTOS_CASAMENTOS.horario, valor: atual.horario },
    { rotulo: TEXTOS_CASAMENTOS.localCerimonia, valor: atual.localCerimonia },
    { rotulo: TEXTOS_CASAMENTOS.localRecepcao, valor: atual.localRecepcao },
    { rotulo: TEXTOS_CASAMENTOS.convidados, valor: atual.convidadosEstimados === null ? null : formatarNumero(atual.convidadosEstimados) },
    ...(autenticacao.ehCasal ? [] : [{ rotulo: TEXTOS_CASAMENTOS.observacoes, valor: atual.observacoes, multilinha: true }]),
  ]
})

watch(
  () => props.id,
  (id) => {
    void store.obter(id)
    void financeiro.carregarAlertasCasamento(id)
  },
  { immediate: true },
)

watch(nomes, (valor) => {
  if (valor) {
    document.title = TEXTOS_CASAMENTOS.tituloDocumento(valor)
  }
}, { immediate: true })

async function alternarArquivamento() {
  const atual = casamento.value
  if (!atual) {
    return
  }
  processando.value = true
  const resultado = atual.arquivado ? await store.restaurar(atual.id) : await store.arquivar(atual.id)
  processando.value = false

  if (resultado.ok) {
    if (resultado.valor.arquivado) {
      notificacao.sucesso(TEXTOS_CASAMENTOS.arquivado(nomes.value), { desfazer: () => desfazerArquivamento(resultado.valor.id) })
    } else {
      notificacao.sucesso(TEXTOS_CASAMENTOS.restaurado(nomes.value))
    }
    return
  }

  if (resultado.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_CASAMENTOS.semPermissao)
    return
  }
  notificacao.erro()
}

async function desfazerArquivamento(id: string) {
  const resultado = await store.restaurar(id)
  if (resultado.ok) {
    notificacao.sucesso(TEXTOS_CASAMENTOS.restaurado(nomes.value))
    return
  }
  notificacao.erro()
}
</script>

<template>
  <LayoutPainelUsuario>
    <EstadoCarregando
      v-if="store.carregandoAtual && !casamento"
      variante="cartao"
      :linhas="2"
    />

    <div
      v-else-if="store.falhaAtual"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        v-if="store.falhaAtual.tipo === 'naoEncontrado'"
        :titulo="TEXTOS_CASAMENTOS.naoEncontradoTitulo"
        :mensagem="TEXTOS_CASAMENTOS.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <EstadoErro
        v-else
        :titulo="TEXTOS_CASAMENTOS.erroCarregarUmTitulo"
        :mensagem="store.falhaAtual.tipo === 'semPermissao' ? TEXTOS_CASAMENTOS.semAcesso : TEXTOS_CASAMENTOS.erroCarregarTexto"
        :variante="store.falhaAtual.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
        :pode-tentar-novamente="store.falhaAtual.tipo !== 'semPermissao'"
        @tentar-novamente="store.obter(id)"
      />
      <RouterLink
        v-if="autenticacao.ehCasal && autenticacao.casamentoDoCasal"
        class="casamento__voltar"
        :to="{ name: 'casamento', params: { id: autenticacao.casamentoDoCasal } }"
        data-teste="voltar-nosso-casamento"
      >
        {{ TEXTOS_AREA_CASAL.voltarNossoCasamento }}
      </RouterLink>
      <RouterLink
        v-else
        class="casamento__voltar"
        :to="{ name: 'casamentos' }"
        data-teste="voltar-casamentos"
      >
        {{ TEXTOS_CASAMENTOS.voltarLista }}
      </RouterLink>
    </div>

    <template v-else-if="casamento">
      <CabecalhoPagina
        :titulo="nomes"
        tamanho="display"
      >
        <template #titulo>
          <NomesCasal
            :primeiro="casamento.nomePrimeiraPessoa"
            :segundo="casamento.nomeSegundaPessoa"
            tamanho="display"
          />
        </template>
        <template #detalhes>
          <span class="numeros-tabulares casamento__quando">{{ quando }}</span>
          <span v-if="casamento.localCerimonia">{{ casamento.localCerimonia }}</span>
          <span class="casamento__situacao">
            <BadgeStatus
              :texto="ROTULOS_FASE[casamento.fase]"
              :variante="VARIANTE_FASE[casamento.fase]"
            />
            <BadgeStatus
              v-if="casamento.arquivado"
              :texto="TEXTOS_CASAMENTOS.statusArquivado"
              icone="arquivar"
            />
          </span>
        </template>
        <template #destaque>
          <ContagemRegressiva
            :dias="casamento.diasRestantes"
            variante="cabecalho"
          />
        </template>
        <template
          v-if="!autenticacao.ehCasal"
          #acoes
        >
          <Button
            :label="TEXTOS_DUPLICACAO_CASAMENTO.acaoDuplicar"
            :aria-label="TEXTOS_DUPLICACAO_CASAMENTO.acaoDuplicarAcessivel(nomes)"
            icon="ie ie-copiar"
            severity="secondary"
            outlined
            data-teste="duplicar-casamento"
            @click="roteador.push({ name: 'casamento-duplicar', query: { origem: casamento.id } })"
          />
          <Button
            :label="casamento.arquivado ? TEXTOS_CASAMENTOS.restaurar : TEXTOS_CASAMENTOS.arquivar"
            :icon="casamento.arquivado ? 'ie ie-restaurar' : 'ie ie-arquivar'"
            :severity="casamento.arquivado ? undefined : 'secondary'"
            :outlined="!casamento.arquivado"
            :loading="processando"
            :data-teste="casamento.arquivado ? 'restaurar-casamento' : 'arquivar-casamento'"
            @click="alternarArquivamento"
          />
          <Button
            v-if="!casamento.arquivado"
            :label="TEXTOS_CASAMENTOS.editarCasamento"
            icon="ie ie-editar"
            data-teste="editar-casamento"
            @click="roteador.push({ name: 'casamento-editar', params: { id: casamento.id } })"
          />
        </template>
      </CabecalhoPagina>

      <div class="casamento pilha pilha--bloco">
        <div
          v-if="casamento.arquivado || dadosFaltantes.length > 0"
          class="pilha pilha--grupo"
        >
          <MensagemFormulario
            v-if="casamento.arquivado"
            variante="informacao"
            :mensagem="TEXTOS_CASAMENTOS.avisoArquivado"
            data-teste="aviso-arquivado"
          />

          <MensagemFormulario
            v-for="faltante in dadosFaltantes"
            :key="faltante.titulo"
            variante="alerta"
            :mensagem="faltante.titulo"
            data-teste="dados-incompletos"
          >
            <span>{{ faltante.texto }}</span>
            <RouterLink :to="{ name: 'casamento-editar', params: { id: casamento.id } }">
              {{ faltante.acao }}
            </RouterLink>
          </MensagemFormulario>
        </div>

        <BlocoProximosPassos
          v-if="!autenticacao.ehCasal && !casamento.arquivado"
          :casamento-id="casamento.id"
        />

        <div
          class="casamento__resumo"
          data-teste="resumo-casamento"
        >
          <BlocoAlertasPagamentos
            v-if="!casamento.arquivado"
            :alertas="financeiro.casamentoAlertas === casamento.id ? financeiro.alertasCasamento : null"
            contexto="casamento"
            :carregando="financeiro.carregandoAlertasCasamento"
            :com-erro="financeiro.casamentoAlertas === casamento.id && financeiro.falhaAlertasCasamento !== null"
            :destino-financeiro="{ name: 'casamento-financeiro', params: { id: casamento.id } }"
            @tentar-novamente="financeiro.carregarAlertasCasamento(casamento.id)"
          />

          <section
            class="cartao pilha pilha--campo"
            aria-labelledby="titulo-detalhes"
            data-teste="detalhes-casamento"
          >
            <h2 id="titulo-detalhes">
              {{ TEXTOS_CASAMENTOS.detalhesTitulo }}
            </h2>
            <ListaDetalhes
              :itens="detalhes"
              embutida
            />
          </section>
        </div>

        <BlocoConvidados
          :casamento-id="casamento.id"
          :arquivado="casamento.arquivado"
          :convidados-estimados="casamento.convidadosEstimados"
        />

        <BlocoAcessoCasal
          v-if="!autenticacao.ehCasal"
          :casamento-id="casamento.id"
          :arquivado="casamento.arquivado"
        />
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.casamento__quando::first-letter {
  text-transform: uppercase;
}

.casamento__situacao {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
}

.casamento__resumo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(28rem, 100%), 1fr));
  gap: var(--p-ritmo-cartao);
  align-items: start;
}

.casamento__voltar {
  align-self: flex-start;
}
</style>
