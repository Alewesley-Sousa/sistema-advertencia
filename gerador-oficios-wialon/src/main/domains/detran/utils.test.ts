import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { chaveMulta, normalizarIdentificador, sanitizarNome } from './utils'

describe('chaveMulta', () => {
  it('junta AIT e data da infração', () => {
    assert.equal(chaveMulta('M601204981', '25/09/2026'), 'M601204981|25/09/2026')
  })

  it('ignora espaços nas pontas', () => {
    assert.equal(chaveMulta(' M601 ', ' 01/01/2026 '), 'M601|01/01/2026')
  })

  it('o mesmo AIT em datas diferentes gera chaves diferentes', () => {
    assert.notEqual(chaveMulta('A1', '01/01/2026'), chaveMulta('A1', '02/01/2026'))
  })

  it('tolera valores vazios', () => {
    assert.equal(chaveMulta('', ''), '|')
  })
})

describe('normalizarIdentificador', () => {
  it('deixa só letras maiúsculas e números', () => {
    assert.equal(normalizarIdentificador(' abc-1d23 '), 'ABC1D23')
  })

  it('aceita null e undefined', () => {
    assert.equal(normalizarIdentificador(null), '')
    assert.equal(normalizarIdentificador(undefined), '')
  })

  it('remove espaços e pontuação do chassi', () => {
    assert.equal(normalizarIdentificador('9BW ZZZ.377 VT004251'), '9BWZZZ377VT004251')
  })
})

describe('sanitizarNome', () => {
  it('troca caracteres inválidos e limita o tamanho', () => {
    assert.equal(sanitizarNome('a/b:c'), 'a_b_c')
    assert.equal(sanitizarNome('x'.repeat(300)).length, 100)
  })
})
