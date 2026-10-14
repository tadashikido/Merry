import { nextTick } from 'vue'

export async function focarElemento(id: string): Promise<void> {
  await nextTick()
  document.getElementById(id)?.focus()
}
