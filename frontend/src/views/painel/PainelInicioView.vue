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
import type { PassoPrimeiroAcesso } from '@/componentes/base/tipos'
import CartaoEvento from '@/componentes/eventos/CartaoEvento.vue'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import BlocoPendenciasTarefas from '@/componentes/tarefas/BlocoPendenciasTarefas.vue'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { useFinanceiroStore } from '@/stores/financeiro'
import { useTarefasStore } from '@/stores/tarefas'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { PASSOS_PRIMEIRO_ACESSO } from '@/textos/proximosPassos'
import { primeiroNome } from '@/utilitarios/formatacao'

const autenticacao = useAutenticacaoStore()
const eventos = useEventosStore()
const tarefas = useTarefasStore()
const financeiro = useFinanceiroStore()
const roteador = useRouter()

const nomeUsuario = computed(() => autenticacao.usuario?.nome ?? '')
const nomeOrganizacao = computed(() => autenticacao.usuario?.organizacao.nome ?? '')
const semPermissao = computed(() => eventos.falha?.tipo === 'semPermissao')
const primeiroAcesso = computed(() => eventos.carregado && !eventos.falha && eventos.itens.length === 0)
const temRealizados = computed(() => eventos.itens.length > eventos.proximos.length)
const exibirPendencias = computed(
  () => !autenticacao.ehAnfitriao && eventos.carregado && !eventos.falha && eventos.itens.length > 0,
)

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
  if (!autenticacao.ehAnfitriao) {
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
        v-if="!primeiroAcesso"
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

    <div class="pilha pilha--secao">
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
            v-if="eventos.proximos.length > 0 || temRealizados"
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

        <EstadoPrimeiroAcesso
          v-else-if="primeiroAcesso"
          :titulo="TEXTOS_PAINEL.primeiroAcessoTitulo"
          :descricao="TEXTOS_PAINEL.primeiroAcessoTexto"
          :passos="passosPrimeiroAcesso"
          :rotulo-acao="TEXTOS_EVENTOS.novoEvento"
          @continuar="novoEvento"
        />

        <EstadoVazio
          v-else-if="eventos.proximos.length === 0"
          icone="calendario"
          :titulo="TEXTOS_EVENTOS.painelVazioTitulo"
          :descricao="TEXTOS_EVENTOS.painelVazioTexto"
        >
          <template #acao>
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

@media (max-width: 639px) {
  .painel-inicio__ver-todos {
    width: 100%;
    min-height: var(--p-dimensao-alvo-toque);
  }
}

@media (min-width: 1024px) {
  .painel-inicio__pendencias {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
