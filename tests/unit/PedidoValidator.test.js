const { PedidoValidator } = require('../../src/validation/PedidoValidator');
const { PedidoBuilder } = require('../builders/PedidoBuilder');

describe('PedidoValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new PedidoValidator();
  });

  test('deve aceitar um pedido válido', () => {
    const pedido = new PedidoBuilder().build();

    expect(validator.validar(pedido)).toBe(true);
  });

  test.each([
    [undefined],
    [null],
    ['email-invalido'],
    ['cliente@dominio'],
    ['@dominio.com'],
    ['cliente@.com']
  ])('deve rejeitar e-mail inválido: %p', (email) => {
    const pedido = new PedidoBuilder()
      .comEmail(email)
      .build();

    expect(() => validator.validar(pedido))
      .toThrow('E-mail do cliente inválido');
  });

  test.each([
    [undefined],
    [null],
    ['150'],
    [0],
    [-1]
  ])('deve rejeitar valor inválido: %p', (valor) => {
    const pedido = new PedidoBuilder()
      .comValor(valor)
      .build();

    expect(() => validator.validar(pedido))
      .toThrow('Valor do pedido inválido');
  });

  test.each([
    [undefined],
    [null],
    ['cartao'],
    [[]]
  ])('deve rejeitar cartão inválido: %p', (cartao) => {
    const pedido = new PedidoBuilder()
      .comCartao(cartao)
      .build();

    expect(() => validator.validar(pedido))
      .toThrow('Cartão inválido');
  });

  test.each([
    [
      { validade: '12/30', cvv: '123' },
      'Número do cartão é obrigatório'
    ],
    [
      { numero: '4111111111111111', cvv: '123' },
      'Validade do cartão é obrigatória'
    ],
    [
      { numero: '4111111111111111', validade: '12/30' },
      'CVV do cartão é obrigatório'
    ]
  ])('deve rejeitar cartão incompleto', (cartao, mensagem) => {
    const pedido = new PedidoBuilder()
      .comCartao(cartao)
      .build();

    expect(() => validator.validar(pedido))
      .toThrow(mensagem);
  });
});
