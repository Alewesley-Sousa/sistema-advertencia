// apps/detran/src/main/domains/detran/automacao/travaRotinas.ts
//
// Trava única em memória: a rotina semanal e a de multas novas nunca consultam o DETRAN ao mesmo tempo
// (duas rodadas em paralelo disputariam o portal e a mesma lista de veículos).

let dono: string | null = null

export const travaRotinas = {
  adquirir(nome: string): boolean {
    if (dono) return false
    dono = nome
    return true
  },
  liberar(nome: string) {
    if (dono === nome) dono = null
  },
  ocupadaPor(): string | null {
    return dono
  },
}
