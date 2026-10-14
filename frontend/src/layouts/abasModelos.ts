import type { AbaSecao } from '@/componentes/base/tipos'
import { TEXTOS_ABAS_MODELOS } from '@/textos/modelosCronograma'

export const ABAS_MODELOS: AbaSecao[] = [
  { chave: 'checklist', rotulo: TEXTOS_ABAS_MODELOS.checklist, rota: { name: 'modelos-checklist' } },
  { chave: 'cronograma', rotulo: TEXTOS_ABAS_MODELOS.cronograma, rota: { name: 'modelos-cronograma' } },
]
