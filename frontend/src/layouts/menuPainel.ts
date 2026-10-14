import type { ItemRail } from './tipos'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { TEXTOS_AREA_CASAL } from '@/textos/acessoCasal'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'

export const ITENS_RAIL_ASSESSORIA: ItemRail[] = [
  { rotulo: TEXTOS_PAINEL.menuInicio, icone: 'dashboard', rota: { name: 'inicio' }, prefixoAtivo: '/' },
  { rotulo: TEXTOS_CASAMENTOS.menu, icone: 'casamento', rota: { name: 'casamentos' }, prefixoAtivo: '/casamentos' },
  { rotulo: TEXTOS_FORNECEDORES.menu, icone: 'fornecedor', rota: { name: 'fornecedores' }, prefixoAtivo: '/fornecedores' },
  { rotulo: TEXTOS_MODELOS_CHECKLIST.menu, icone: 'lista', rota: { name: 'modelos-checklist' }, prefixoAtivo: '/modelos-checklist', prefixosAdicionais: ['/modelos-cronograma'] },
]

export function itensRailCasal(casamentoId: string): ItemRail[] {
  return [
    {
      rotulo: TEXTOS_AREA_CASAL.menuNossoCasamento,
      icone: 'casamento',
      rota: { name: 'casamento', params: { id: casamentoId } },
      prefixoAtivo: '/casamentos',
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
