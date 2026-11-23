// apps/detran/src/main/seguranca/cli.ts
//
// Administração pelo servidor (não existe rota HTTP para isso — de propósito):
//   npm run dispositivos -- listar
//   npm run dispositivos -- aprovar 7F3A-91C2 "PC da Maria"
//   npm run dispositivos -- revogar 7F3A-91C2
//   npm run dispositivos -- remover 7F3A-91C2
//   npm run dispositivos -- backup

import 'dotenv/config'

import { db } from '../database/db'
import { criarServicoDispositivos, criarTabelaDispositivos } from './dispositivos'

criarTabelaDispositivos(db as any)
const servico = criarServicoDispositivos(db as any)
const [, , cmd, codigo, ...resto] = process.argv

function uso(): never {
  console.log(`Uso:
  listar
  aprovar <codigo> ["nome do computador"]
  revogar <codigo>
  remover <codigo>
  backup`)
  process.exit(2)
}

async function main() {
  switch (cmd) {
    case 'listar': {
      const lista = servico.listar()
      if (!lista.length) return console.log('Nenhum dispositivo cadastrado.')
      for (const d of lista) {
        console.log(
          `${d.codigo}  ${d.status.padEnd(9)}  ${(d.rotulo ?? '-').padEnd(24)}  ip ${(d.ipUltimo ?? '-').padEnd(15)}  último acesso ${d.ultimoAcessoEm ?? '-'}`
        )
      }
      return
    }
    case 'aprovar':
      if (!codigo) uso()
      console.log(servico.aprovar(codigo, resto.join(' ')) ? 'Dispositivo APROVADO.' : 'Código não encontrado (ou já aprovado).')
      return
    case 'revogar':
      if (!codigo) uso()
      console.log(servico.revogar(codigo) ? 'Dispositivo REVOGADO.' : 'Código não encontrado.')
      return
    case 'remover':
      if (!codigo) uso()
      console.log(servico.remover(codigo) ? 'Dispositivo removido.' : 'Código não encontrado.')
      return
    case 'backup': {
      const { executarBackup } = await import('./backupAgendador')
      await executarBackup()
      return
    }
    default:
      uso()
  }
}

main().catch((e) => {
  console.error('Erro:', e?.message ?? e)
  process.exit(1)
})
