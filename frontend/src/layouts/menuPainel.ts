import type { ItemRail } from './tipos'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_AREA_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'

export const ITENS_RAIL_ASSESSORIA: ItemRail[] = [
  { rotulo: TEXTOS_PAINEL.menuInicio, icone: 'dashboard', rota: { name: 'inicio' }, prefixoAtivo: '/' },
  { rotulo: TEXTOS_EVENTOS.menu, icone: 'evento', rota: { name: 'eventos' }, prefixoAtivo: '/eventos' },
  { rotulo: TEXTOS_FORNECEDORES.menu, icone: 'fornecedor', rota: { name: 'fornecedores' }, prefixoAtivo: '/fornecedores' },
  { rotulo: TEXTOS_MODELOS_CHECKLIST.menu, icone: 'lista', rota: { name: 'modelos-checklist' }, prefixoAtivo: '/modelos-checklist', prefixosAdicionais: ['/modelos-cronograma'] },
]

export function itensRailAnfitriao(eventoId: string): ItemRail[] {
  return [
    {
      rotulo: TEXTOS_AREA_ANFITRIAO.menuNossoEvento,
      icone: 'evento',
      rota: { name: 'evento', params: { id: eventoId } },
      prefixoAtivo: '/eventos',
    },
  ]
}

export function itemRailAtivo(item: ItemRail, caminhoAtual: string): boolean {
  if (item.prefixoAtivo === '/') {
    return caminhoAtual === '/'
  }
  return [item.prefixoAtivo, ...(item.prefixosAdicionais ?? [])].some(
    (prefixo) => caminhoAtual === prefixo || caminhoAtual.startsWith(`${prefixo}/`),
  )
}
