const {
  PedidoValidator
} = require('../../src/validation/PedidoValidator');

const {
  PedidoBuilder
} = require('../builders/PedidoBuilder');

describe('PedidoValidator - casos de limite', () => {
  let validator;

  beforeEach(() => {
    validator = new PedidoValidator();
  });

  test('deve rejeitar pedido inexistente com erro controlado', () => {
    expect(() => validator.validar(undefined))
      .toThrow('E-mail do cliente inválido');
  });

  test('deve aceitar e-mail válido com espaços externos', () => {
    const pedido = new PedidoBuilder()
      .comEmail('  cliente@dominio.com  ')
      .build();

    expect(validator.validar(pedido)).toBe(true);
  });

  test.each([
    'prefixo cliente@dominio.com',
    'cliente@dominio.com sufixo'
  ])(
    'deve rejeitar e-mail com conteúdo adicional: %s',
    (email) => {
      const pedido = new PedidoBuilder()
        .comEmail(email)
        .build();

      expect(() => validator.validar(pedido))
        .toThrow('E-mail do cliente inválido');
    }
  );

  test.each([
    NaN,
    Infinity,
    -Infinity
  ])(
    'deve rejeitar valor numérico não finito: %p',
    (valor) => {
      const pedido = new PedidoBuilder()
        .comValor(valor)
        .build();

      expect(() => validator.validar(pedido))
        .toThrow('Valor do pedido inválido');
    }
  );

  test.each([
    [
      {
        numero: '   ',
        validade: '12/30',
        cvv: '123'
      },
      'Número do cartão é obrigatório'
    ],
    [
      {
        numero: '4111111111111111',
        validade: '   ',
        cvv: '123'
      },
      'Validade do cartão é obrigatória'
    ],
    [
      {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '   '
      },
      'CVV do cartão é obrigatório'
    ]
  ])(
    'deve rejeitar campos do cartão preenchidos apenas com espaços',
    (cartao, mensagem) => {
      const pedido = new PedidoBuilder()
        .comCartao(cartao)
        .build();

      expect(() => validator.validar(pedido))
        .toThrow(mensagem);
    }
  );
});
