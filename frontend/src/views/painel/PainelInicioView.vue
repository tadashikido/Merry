<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoPrimeiroAcesso from '@/componentes/base/EstadoPrimeiroAcesso.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import OrientacaoAcesso, { type ItemOrientacaoAcesso } from '@/componentes/base/OrientacaoAcesso.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { ItemContagem, PassoPrimeiroAcesso } from '@/componentes/base/tipos'
import CartaoEvento from '@/componentes/eventos/CartaoEvento.vue'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import BlocoPendenciasTarefas from '@/componentes/tarefas/BlocoPendenciasTarefas.vue'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { useFinanceiroStore } from '@/stores/financeiro'
import { useTarefasStore } from '@/stores/tarefas'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_PAINEL_INICIO } from '@/textos/painelInicio'
import { PASSOS_PRIMEIRO_ACESSO } from '@/textos/proximosPassos'
import { VOCABULARIO_TIPO_EVENTO, tiposEventoEmFrase } from '@/textos/tiposEvento'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import { descreverCarteiraPorTipo, resumirCarteira } from '@/utilitarios/carteiraEventos'
import { primeiroNome } from '@/utilitarios/formatacao'

const autenticacao = useAutenticacaoStore()
const eventos = useEventosStore()
const tarefas = useTarefasStore()
const financeiro = useFinanceiroStore()
const roteador = useRouter()

const nomeUsuario = computed(() => autenticacao.usuario?.nome ?? '')
const nomeOrganizacao = computed(() => autenticacao.usuario?.organizacao.nome ?? '')
const ehAssessoria = computed(() => !autenticacao.ehAnfitriao)
const semPermissao = computed(() => eventos.falha?.tipo === 'semPermissao')
const listaCarregada = computed(() => eventos.carregado && !eventos.falha)
const listaAtualizada = computed(() => listaCarregada.value && !eventos.carregando)
const semEventos = computed(() => listaAtualizada.value && eventos.itens.length === 0)
const primeiroAcesso = computed(() => ehAssessoria.value && semEventos.value)
const anfitriaoSemEvento = computed(() => autenticacao.ehAnfitriao && semEventos.value)
const temRealizados = computed(() => eventos.itens.length > eventos.proximos.length)
const exibirPendencias = computed(() => ehAssessoria.value && listaCarregada.value && eventos.itens.length > 0)
const exibirResumoCarteira = computed(() => exibirPendencias.value && !eventos.carregando)
const exibirVerTodos = computed(() => ehAssessoria.value && (eventos.proximos.length > 0 || temRealizados.value))

const carteira = computed(() => resumirCarteira(eventos.itens))

const indicadoresCarteira = computed<ItemContagem[]>(() => {
  const resumo = carteira.value
  return [
    {
      chave: 'pela-frente',
      valor: resumo.pelaFrente,
      rotulo: TEXTOS_PAINEL_INICIO.pelaFrente,
      detalhe: resumo.porTipo.length > 0 ? descreverCarteiraPorTipo(resumo.porTipo) : undefined,
    },
    {
      chave: 'proximos-7-dias',
      valor: resumo.proximos7Dias,
      rotulo: TEXTOS_PAINEL_INICIO.proximos7Dias,
      destaque: resumo.proximos7Dias > 0,
    },
    { chave: 'proximos-30-dias', valor: resumo.proximos30Dias, rotulo: TEXTOS_PAINEL_INICIO.proximos30Dias },
    {
      chave: 'realizados',
      valor: resumo.realizados,
      rotulo: TEXTOS_PAINEL_INICIO.realizados,
      detalhe: resumo.realizados > 0 ? TEXTOS_PAINEL_INICIO.realizadosDetalhe : undefined,
    },
  ]
})

const tiposParaOrganizar: ItemOrientacaoAcesso[] = TIPOS_EVENTO.map((tipo) => ({
  chave: tipo,
  titulo: VOCABULARIO_TIPO_EVENTO[tipo].rotulo,
  texto: VOCABULARIO_TIPO_EVENTO[tipo].descricao,
  teste: `tipo-organizar-${tipo}`,
}))

const textoPrimeiroAcesso = TEXTOS_PAINEL.primeiroAcessoTexto(tiposEventoEmFrase())

const passosPrimeiroAcesso: PassoPrimeiroAcesso[] = PASSOS_PRIMEIRO_ACESSO.map((rotulo, indice) => ({
  chave: `passo-${indice}`,
  rotulo,
  concluido: false,
}))

function carregar() {
  void eventos.carregar('Ativos')
  carregarPendencias()
}

function carregarPendencias() {
  if (ehAssessoria.value) {
    void tarefas.carregarPendencias()
    void financeiro.carregarAlertasOrganizacao()
  }
}

function carregarAlertasPagamentos() {
  void financeiro.carregarAlertasOrganizacao()
}

function novoEvento() {
  void roteador.push({ name: 'evento-novo' })
}

onMounted(carregar)
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="TEXTOS_PAINEL.saudacao(primeiroNome(nomeUsuario))"
      :descricao="nomeOrganizacao"
    >
      <template
        v-if="ehAssessoria && !primeiroAcesso"
        #acoes
      >
        <Button
          :label="TEXTOS_EVENTOS.novoEvento"
          icon="ie ie-mais"
          data-teste="novo-evento"
          @click="novoEvento"
        />
      </template>
    </CabecalhoPagina>

    <div class="painel-inicio pilha pilha--secao">
      <div
        v-if="primeiroAcesso"
        class="painel-inicio__primeiro-acesso"
        data-teste="secao-primeiro-acesso"
      >
        <EstadoPrimeiroAcesso
          :titulo="TEXTOS_PAINEL.primeiroAcessoTitulo"
          :descricao="textoPrimeiroAcesso"
          :passos="passosPrimeiroAcesso"
          :rotulo-acao="TEXTOS_EVENTOS.novoEvento"
          @continuar="novoEvento"
        />
        <OrientacaoAcesso
          id-titulo="titulo-tipos-organizar"
          :titulo="TEXTOS_PAINEL_INICIO.tiposTitulo"
          :itens="tiposParaOrganizar"
          data-teste="tipos-organizar"
        >
          {{ TEXTOS_PAINEL_INICIO.tiposNota }}
        </OrientacaoAcesso>
      </div>

      <ResumoContagem
        v-if="exibirResumoCarteira"
        :itens="indicadoresCarteira"
        :rotulo="TEXTOS_PAINEL_INICIO.resumoRotulo"
        variante="indicadores"
        data-teste="resumo-carteira"
      />

      <div
        v-if="exibirPendencias"
        class="painel-inicio__pendencias"
      >
        <BlocoPendenciasTarefas
          :pendencias="tarefas.pendencias"
          :carregando="tarefas.carregandoPendencias"
          :com-erro="tarefas.falhaPendencias !== null"
          @tentar-novamente="carregarPendencias"
        />
        <BlocoAlertasPagamentos
          :alertas="financeiro.alertasOrganizacao"
          contexto="organizacao"
          :carregando="financeiro.carregandoAlertasOrganizacao"
          :com-erro="financeiro.falhaAlertasOrganizacao !== null"
          @tentar-novamente="carregarAlertasPagamentos"
        />
      </div>

      <section
        v-if="!primeiroAcesso"
        class="pilha pilha--cartao"
        aria-labelledby="titulo-proximos"
      >
        <div class="cabecalho-secao">
          <div>
            <h2
              id="titulo-proximos"
              class="painel-inicio__titulo-secao"
            >
              {{ TEXTOS_EVENTOS.proximosTitulo }}
            </h2>
            <p
              v-if="eventos.proximos.length > 0"
              class="texto-legenda"
            >
              {{ TEXTOS_EVENTOS.proximosLegenda }}
            </p>
          </div>
          <Button
            v-if="exibirVerTodos"
            :as="RouterLink"
            :to="{ name: 'eventos' }"
            :label="TEXTOS_EVENTOS.verTodos"
            severity="secondary"
            outlined
            class="painel-inicio__ver-todos"
            data-teste="ver-todos"
          />
        </div>

        <EstadoCarregando
          v-if="eventos.carregando"
          variante="cartao"
          :linhas="3"
        />

        <EstadoErro
          v-else-if="semPermissao"
          :titulo="TEXTOS_EVENTOS.erroCarregarTitulo"
          :mensagem="TEXTOS_EVENTOS.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="eventos.falha"
          :titulo="TEXTOS_EVENTOS.erroCarregarTitulo"
          :mensagem="TEXTOS_EVENTOS.erroCarregarTexto"
          @tentar-novamente="carregar"
        />

        <EstadoVazio
          v-else-if="anfitriaoSemEvento"
          icone="calendario"
          :titulo="TEXTOS_PAINEL_INICIO.anfitriaoVazioTitulo"
          :descricao="TEXTOS_PAINEL_INICIO.anfitriaoVazioTexto"
          data-teste="anfitriao-sem-evento"
        />

        <EstadoVazio
          v-else-if="eventos.proximos.length === 0"
          icone="calendario"
          :titulo="TEXTOS_EVENTOS.painelVazioTitulo"
          :descricao="TEXTOS_EVENTOS.painelVazioTexto"
        >
          <template
            v-if="ehAssessoria"
            #acao
          >
            <Button
              :label="TEXTOS_EVENTOS.novoEvento"
              severity="secondary"
              outlined
              @click="novoEvento"
            />
          </template>
        </EstadoVazio>

        <ul
          v-else
          class="grade grade--larga painel-inicio__eventos"
          data-teste="proximos-eventos"
        >
          <li
            v-for="evento in eventos.proximos"
            :key="evento.id"
          >
            <CartaoEvento :evento="evento" />
          </li>
        </ul>
      </section>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.painel-inicio {
  container: painel-inicio / inline-size;
}

.painel-inicio :deep(.resumo-contagem--indicadores .resumo-contagem__itens.grade) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.painel-inicio__primeiro-acesso {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.painel-inicio__pendencias {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-cartao);
  align-items: start;
}

.painel-inicio__titulo-secao {
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.painel-inicio__eventos {
  margin: 0;
  padding: 0;
  list-style: none;
}

.painel-inicio__ver-todos {
  text-decoration: none;
}

@container painel-inicio (max-width: 39.99rem) {
  .painel-inicio__ver-todos {
    width: 100%;
    min-height: var(--p-dimensao-alvo-toque);
  }
}

@container painel-inicio (min-width: 48rem) {
  .painel-inicio :deep(.resumo-contagem--indicadores .resumo-contagem__itens.grade) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .painel-inicio__primeiro-acesso {
    grid-template-columns: minmax(0, 30rem) minmax(0, 1fr);
  }
}

@container painel-inicio (min-width: 56rem) {
  .painel-inicio__pendencias {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
