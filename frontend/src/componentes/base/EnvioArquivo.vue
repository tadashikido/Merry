<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'

import type { TextosEnvioArquivo } from './tipos'
import { formatarTamanhoArquivo } from '@/utilitarios/arquivo'

const props = withDefaults(
  defineProps<{
    id: string
    textos: TextosEnvioArquivo
    aceite?: string
    arquivo?: Pick<File, 'name' | 'size'> | null
    carregando?: boolean
    erro?: string | null
    desabilitado?: boolean
  }>(),
  {
    aceite: undefined,
    arquivo: null,
    carregando: false,
    erro: null,
    desabilitado: false,
  },
)

const emit = defineEmits<{ selecionar: [arquivo: File] }>()

const entrada = ref<HTMLInputElement | null>(null)
const arrastando = ref(false)

const bloqueado = computed(() => props.desabilitado || props.carregando)
const idLimites = computed(() => `${props.id}-limites`)
const idErro = computed(() => `${props.id}-erro`)
const descritoPor = computed(() => (props.erro ? `${idLimites.value} ${idErro.value}` : idLimites.value))
const estado = computed(() => {
  if (props.carregando) {
    return 'carregando'
  }
  if (props.erro) {
    return 'erro'
  }
  return props.arquivo ? 'selecionado' : 'vazio'
})

function abrirSeletor() {
  if (!bloqueado.value) {
    entrada.value?.click()
  }
}

function aoEscolher(evento: Event) {
  const alvo = evento.target as HTMLInputElement
  const escolhido = alvo.files?.[0]
  if (escolhido) {
    emit('selecionar', escolhido)
  }
  alvo.value = ''
}

function aoArrastar(evento: DragEvent) {
  if (bloqueado.value) {
    return
  }
  evento.preventDefault()
  arrastando.value = true
}

function aoSair() {
  arrastando.value = false
}

function aoSoltar(evento: DragEvent) {
  evento.preventDefault()
  arrastando.value = false
  if (bloqueado.value) {
    return
  }
  const solto = evento.dataTransfer?.files?.[0]
  if (solto) {
    emit('selecionar', solto)
  }
}

const idBotao = computed(() => `${props.id}-botao`)

function focar() {
  document.getElementById(idBotao.value)?.focus()
}

defineExpose({ focar })
</script>

<template>
  <div
    class="envio-arquivo"
    :class="{
      'envio-arquivo--arrastando': arrastando,
      'envio-arquivo--erro': estado === 'erro',
      'envio-arquivo--desabilitado': desabilitado,
    }"
    :data-estado="estado"
    data-teste="envio-arquivo"
    @dragenter="aoArrastar"
    @dragover="aoArrastar"
    @dragleave="aoSair"
    @drop="aoSoltar"
  >
    <label
      :for="id"
      class="somente-leitor-tela"
    >{{ textos.rotulo }}</label>
    <input
      :id="id"
      ref="entrada"
      class="envio-arquivo__entrada"
      type="file"
      tabindex="-1"
      :accept="aceite"
      :disabled="bloqueado"
      :aria-describedby="descritoPor"
      :aria-invalid="estado === 'erro' ? 'true' : undefined"
      data-teste="envio-arquivo-entrada"
      @change="aoEscolher"
    >

    <span
      class="envio-arquivo__icone ie"
      :class="carregando ? 'ie-recarregar envio-arquivo__icone--girando' : 'ie-documento'"
      aria-hidden="true"
    />

    <p
      v-if="carregando"
      class="envio-arquivo__principal"
      role="status"
    >
      {{ textos.carregando }}
    </p>
    <p
      v-else-if="arquivo"
      class="envio-arquivo__principal"
      data-teste="envio-arquivo-nome"
    >
      <span class="envio-arquivo__nome">{{ arquivo.name }}</span>
      <span class="envio-arquivo__tamanho numeros-tabulares">{{ formatarTamanhoArquivo(arquivo.size) }}</span>
    </p>
    <p
      v-else
      class="envio-arquivo__principal envio-arquivo__instrucao"
    >
      {{ textos.instrucao }}
    </p>

    <Button
      :id="idBotao"
      :label="arquivo && !carregando ? textos.trocar : textos.botao"
      icon="ie ie-importar"
      :severity="arquivo ? 'secondary' : undefined"
      :outlined="Boolean(arquivo)"
      :disabled="bloqueado"
      :aria-describedby="descritoPor"
      data-teste="envio-arquivo-botao"
      @click="abrirSeletor"
    />

    <p
      :id="idLimites"
      class="envio-arquivo__limites"
    >
      {{ textos.limites }}
    </p>
    <p
      v-if="erro"
      :id="idErro"
      class="envio-arquivo__erro"
      role="alert"
      data-teste="envio-arquivo-erro"
    >
      <span
        class="ie ie-alerta"
        aria-hidden="true"
      />
      {{ erro }}
    </p>
  </div>
</template>

<style scoped>
.envio-arquivo {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-6) var(--p-espaco-4);
  text-align: center;
  background: var(--p-cor-superficie);
  border: 1px dashed var(--p-cor-borda-campo);
  border-radius: var(--p-raio-painel);
  transition: border-color var(--p-duracao-rapida), background-color var(--p-duracao-rapida);
}

.envio-arquivo--arrastando {
  background: var(--p-primary-50);
  border-color: var(--p-cor-primaria);
  border-style: solid;
}

.envio-arquivo--erro {
  border-color: var(--p-cor-erro);
}

.envio-arquivo--desabilitado {
  background: var(--p-cor-neutro-suave);
}

.envio-arquivo__entrada {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  opacity: 0;
}

.envio-arquivo__icone {
  font-size: 1.75rem;
  color: var(--p-cor-primaria);
}

.envio-arquivo__icone--girando {
  animation: envio-arquivo-girar 1s linear infinite;
}

@keyframes envio-arquivo-girar {
  to {
    transform: rotate(360deg);
  }
}

.envio-arquivo__principal {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--p-espaco-2);
  margin: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.envio-arquivo__instrucao {
  display: none;
}

.envio-arquivo__nome {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.envio-arquivo__tamanho,
.envio-arquivo__limites {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.envio-arquivo__limites {
  margin: 0;
}

.envio-arquivo__erro {
  display: flex;
  gap: var(--p-espaco-2);
  align-items: baseline;
  max-width: 36rem;
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-erro);
  text-align: left;
}

@media (min-width: 640px) {
  .envio-arquivo {
    padding: var(--p-espaco-10) var(--p-espaco-6);
  }

  .envio-arquivo__instrucao {
    display: flex;
  }
}
</style>
