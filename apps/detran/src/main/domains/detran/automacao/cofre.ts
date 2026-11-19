// apps/detran/src/main/domains/detran/automacao/cofre.ts
//
// Criptografia em repouso da lista de veículos (AES-256-GCM).
//
// - A chave NUNCA fica no código nem no banco: vem de `DETRAN_COFRE_CHAVE`
//   (32 bytes em base64) ou é derivada por scrypt de `DETRAN_COFRE_SENHA`.
// - Cada gravação usa um IV aleatório de 12 bytes (nunca reaproveitado).
// - O "AAD" amarra o texto cifrado ao propósito/versão: um blob copiado para
//   outro campo não decifra.
// - GCM autentica: qualquer alteração no arquivo/linha faz a leitura falhar.
// - Mensagens de erro são genéricas: nunca incluem dados, chave ou conteúdo.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITMO = 'aes-256-gcm'
const TAM_CHAVE = 32
const TAM_IV = 12
const TAM_TAG = 16
const VERSAO = 1
const AAD = Buffer.from('detran-cofre-veiculos:v1')
/** Sal fixo por instalação não é necessário: a senha é só um atalho para quem não quer gerar chave aleatória. */
const SAL_SCRYPT = Buffer.from('force-detran-cofre-salt-v1')

export class ErroCofre extends Error {
  constructor(
    message: string,
    public readonly codigo: 'CHAVE_AUSENTE' | 'CHAVE_INVALIDA' | 'DECIFRAR_FALHOU' | 'FORMATO_INVALIDO'
  ) {
    super(message)
    this.name = 'ErroCofre'
  }
}

export interface ChavesCofre {
  /** Chave usada para cifrar (e primeira tentativa ao decifrar). */
  atual: Buffer
  /** Chave anterior, aceita só para decifrar durante uma rotação. */
  anterior?: Buffer
}

interface Envelope {
  v: number
  iv: string
  tag: string
  ct: string
}

/** Gera uma chave aleatória de 256 bits em base64 (use uma vez e guarde fora do repositório). */
export function gerarChaveBase64(): string {
  return randomBytes(TAM_CHAVE).toString('base64')
}

function chaveDeBase64(valor: string): Buffer {
  const bruto = Buffer.from(valor.trim(), 'base64')
  if (bruto.length !== TAM_CHAVE) {
    throw new ErroCofre(
      'DETRAN_COFRE_CHAVE deve ter exatamente 32 bytes em base64 (use `npm run cofre:gerar-chave`).',
      'CHAVE_INVALIDA'
    )
  }
  return bruto
}

function chaveDeSenha(senha: string): Buffer {
  if (senha.length < 16) {
    throw new ErroCofre('DETRAN_COFRE_SENHA deve ter ao menos 16 caracteres.', 'CHAVE_INVALIDA')
  }
  return scryptSync(senha, SAL_SCRYPT, TAM_CHAVE, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 })
}

/** Lê as chaves do ambiente. Chave aleatória tem prioridade sobre senha. */
export function carregarChaves(env: NodeJS.ProcessEnv = process.env): ChavesCofre {
  const chave = env.DETRAN_COFRE_CHAVE?.trim()
  const senha = env.DETRAN_COFRE_SENHA
  if (!chave && !senha) {
    throw new ErroCofre(
      'Cofre sem chave: defina DETRAN_COFRE_CHAVE (recomendado) ou DETRAN_COFRE_SENHA no ambiente.',
      'CHAVE_AUSENTE'
    )
  }
  const atual = chave ? chaveDeBase64(chave) : chaveDeSenha(senha!)

  const anteriorB64 = env.DETRAN_COFRE_CHAVE_ANTERIOR?.trim()
  return { atual, anterior: anteriorB64 ? chaveDeBase64(anteriorB64) : undefined }
}

export function cifrar(textoClaro: string, chaves: ChavesCofre): string {
  const iv = randomBytes(TAM_IV)
  const cifra = createCipheriv(ALGORITMO, chaves.atual, iv, { authTagLength: TAM_TAG })
  cifra.setAAD(AAD)
  const ct = Buffer.concat([cifra.update(textoClaro, 'utf8'), cifra.final()])
  const envelope: Envelope = {
    v: VERSAO,
    iv: iv.toString('base64'),
    tag: cifra.getAuthTag().toString('base64'),
    ct: ct.toString('base64'),
  }
  return JSON.stringify(envelope)
}

function tentarDecifrar(env: Envelope, chave: Buffer): string | null {
  try {
    const decifra = createDecipheriv(ALGORITMO, chave, Buffer.from(env.iv, 'base64'), {
      authTagLength: TAM_TAG,
    })
    decifra.setAAD(AAD)
    decifra.setAuthTag(Buffer.from(env.tag, 'base64'))
    return Buffer.concat([decifra.update(Buffer.from(env.ct, 'base64')), decifra.final()]).toString('utf8')
  } catch {
    return null
  }
}

export interface ResultadoDecifrar {
  texto: string
  /** true quando só a chave anterior abriu — o chamador deve regravar com a chave atual. */
  usouChaveAnterior: boolean
}

export function decifrar(blob: string, chaves: ChavesCofre): ResultadoDecifrar {
  let envelope: Envelope
  try {
    envelope = JSON.parse(blob)
  } catch {
    throw new ErroCofre('Conteúdo do cofre em formato inválido.', 'FORMATO_INVALIDO')
  }
  if (envelope?.v !== VERSAO || !envelope.iv || !envelope.tag || !envelope.ct) {
    throw new ErroCofre('Versão ou estrutura do cofre não reconhecida.', 'FORMATO_INVALIDO')
  }

  const comAtual = tentarDecifrar(envelope, chaves.atual)
  if (comAtual != null) return { texto: comAtual, usouChaveAnterior: false }

  if (chaves.anterior) {
    const comAnterior = tentarDecifrar(envelope, chaves.anterior)
    if (comAnterior != null) return { texto: comAnterior, usouChaveAnterior: true }
  }
  throw new ErroCofre(
    'Não foi possível decifrar o cofre: chave incorreta ou dados adulterados.',
    'DECIFRAR_FALHOU'
  )
}
