import { db } from '../database/db'

export interface Configuracao {
  chave: string
  valor: string
}

export const configuracaoRepository = {
  listar(): Configuracao[] {
    return db.prepare('SELECT chave, valor FROM configuracoes').all() as Configuracao[]
  },

  obterPorChave(chave: string): Configuracao | undefined {
    return db.prepare('SELECT chave, valor FROM configuracoes WHERE chave = ?').get(chave) as Configuracao | undefined
  },

  salvar(chave: string, valor: string) {
    return db.prepare(`
      INSERT INTO configuracoes (chave, valor) 
      VALUES (?, ?) 
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `).run(chave, valor)
  },

  deletar(chave: string) {
    return db.prepare('DELETE FROM configuracoes WHERE chave = ?').run(chave)
  }
}