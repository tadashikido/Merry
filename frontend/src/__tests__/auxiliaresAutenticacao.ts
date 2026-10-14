import { vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import type { Component } from 'vue'

import { rotas } from '@/router'
import { instalarGuardaAutenticacao } from '@/router/guardaAutenticacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import type { SessaoDto } from '@/tipos/api'

export const SESSAO_EXEMPLO: SessaoDto = {
  tokenAcesso: 'token-de-acesso',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u1',
    nome: 'Renata Albuquerque',
    email: 'renata@exemplo.com',
    papel: 'Dono',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
  },
}

export function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

export function respostaProblema(status: number, corpo: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ status, title: 'Erro', ...corpo }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

export function respostaVazia(status = 204): Response {
  return new Response(null, { status })
}

export function simularFetch() {
  const fetchSimulado = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchSimulado)
  return fetchSimulado
}

export interface Montagem {
  roteador: Router
  pinia: Pinia
}

export async function prepararAplicacao(caminhoInicial: string): Promise<Montagem> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
  instalarGuardaAutenticacao(roteador, useAutenticacaoStore(pinia))
  await roteador.push(caminhoInicial)
  await roteador.isReady()
  return { roteador, pinia }
}

export async function montarView(componente: Component, montagem: Montagem) {
  const wrapper = mount(componente, {
    attachTo: document.body,
    global: { plugins: [montagem.roteador, montagem.pinia, [PrimeVue, { unstyled: true }], ToastService] },
  })
  await flushPromises()
  return wrapper
}

export function corpoDaChamada(chamada: Parameters<typeof fetch>): unknown {
  const corpo = chamada[1]?.body
  return typeof corpo === 'string' ? JSON.parse(corpo) : undefined
}
