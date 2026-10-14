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
import CartaoCasamento from '@/componentes/casamentos/CartaoCasamento.vue'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import BlocoPendenciasTarefas from '@/componentes/tarefas/BlocoPendenciasTarefas.vue'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useFinanceiroStore } from '@/stores/financeiro'
import { useTarefasStore } from '@/stores/tarefas'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { primeiroNome } from '@/utilitarios/formatacao'

const autenticacao = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const tarefas = useTarefasStore()
const financeiro = useFinanceiroStore()
const roteador = useRouter()

const nomeUsuario = computed(() => autenticacao.usuario?.nome ?? '')
const nomeOrganizacao = computed(() => autenticacao.usuario?.organizacao.nome ?? '')
const semPermissao = computed(() => casamentos.falha?.tipo === 'semPermissao')
const primeiroAcesso = computed(() => casamentos.carregado && !casamentos.falha && casamentos.itens.length === 0)
const temRealizados = computed(() => casamentos.itens.length > casamentos.proximos.length)
const exibirPendencias = computed(
  () => !autenticacao.ehCasal && casamentos.carregado && !casamentos.falha && casamentos.itens.length > 0,
)

const passosPrimeiroAcesso: PassoPrimeiroAcesso[] = TEXTOS_PAINEL.primeiroAcessoPassos.map((rotulo, indice) => ({
  chave: `passo-${indice}`,
  rotulo,
  concluido: false,
}))

function carregar() {
  void casamentos.carregar('Ativos')
  carregarPendencias()
}

function carregarPendencias() {
  if (!autenticacao.ehCasal) {
    void tarefas.carregarPendencias()
    void financeiro.carregarAlertasOrganizacao()
  }
}

function carregarAlertasPagamentos() {
  void financeiro.carregarAlertasOrganizacao()
}

function novoCasamento() {
  void roteador.push({ name: 'casamento-novo' })
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
          :label="TEXTOS_CASAMENTOS.novoCasamento"
          icon="ie ie-mais"
          data-teste="novo-casamento"
          @click="novoCasamento"
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
              {{ TEXTOS_CASAMENTOS.proximosTitulo }}
            </h2>
            <p
              v-if="casamentos.proximos.length > 0"
              class="texto-legenda"
            >
              {{ TEXTOS_CASAMENTOS.proximosLegenda }}
            </p>
          </div>
          <Button
            v-if="casamentos.proximos.length > 0 || temRealizados"
            :as="RouterLink"
            :to="{ name: 'casamentos' }"
            :label="TEXTOS_CASAMENTOS.verTodos"
            severity="secondary"
            outlined
            class="painel-inicio__ver-todos"
            data-teste="ver-todos"
          />
        </div>

        <EstadoCarregando
          v-if="casamentos.carregando"
          variante="cartao"
          :linhas="3"
        />

        <EstadoErro
          v-else-if="semPermissao"
          :titulo="TEXTOS_CASAMENTOS.erroCarregarTitulo"
          :mensagem="TEXTOS_CASAMENTOS.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="casamentos.falha"
          :titulo="TEXTOS_CASAMENTOS.erroCarregarTitulo"
          :mensagem="TEXTOS_CASAMENTOS.erroCarregarTexto"
          @tentar-novamente="carregar"
        />

        <EstadoPrimeiroAcesso
          v-else-if="primeiroAcesso"
          :titulo="TEXTOS_PAINEL.primeiroAcessoTitulo"
          :descricao="TEXTOS_PAINEL.primeiroAcessoTexto"
          :passos="passosPrimeiroAcesso"
          :rotulo-acao="TEXTOS_CASAMENTOS.novoCasamento"
          @continuar="novoCasamento"
        />

        <EstadoVazio
          v-else-if="casamentos.proximos.length === 0"
          icone="calendario"
          :titulo="TEXTOS_CASAMENTOS.painelVazioTitulo"
          :descricao="TEXTOS_CASAMENTOS.painelVazioTexto"
        >
          <template #acao>
            <Button
              :label="TEXTOS_CASAMENTOS.novoCasamento"
              severity="secondary"
              outlined
              @click="novoCasamento"
            />
          </template>
        </EstadoVazio>

        <ul
          v-else
          class="grade grade--larga painel-inicio__casamentos"
          data-teste="proximos-casamentos"
        >
          <li
            v-for="casamento in casamentos.proximos"
            :key="casamento.id"
          >
            <CartaoCasamento :casamento="casamento" />
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

.painel-inicio__casamentos {
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
