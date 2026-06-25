const { PedidoValidator } = require('../../src/validation/PedidoValidator');

describe('PedidoValidator', () => {
  test('deve rejeitar pedido com e-mail inválido', () => {
    const validator = new PedidoValidator();

    const pedido = {
      clienteEmail: 'email-invalido',
      valor: 150,
      cartao: {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
      }
    };

    expect(() => validator.validar(pedido))
      .toThrow('E-mail do cliente inválido');
  });
});
