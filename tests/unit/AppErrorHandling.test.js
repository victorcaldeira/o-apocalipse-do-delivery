const request = require('supertest');

const {
  createApp
} = require('../../src/app');

describe('createApp - tratamentos de erro', () => {
  test('deve exigir o serviço de checkout', () => {
    expect(() => createApp({}))
      .toThrow('checkoutService é obrigatório');
  });

  test.each([
    'E-mail do cliente inválido',
    'Valor do pedido inválido',
    'Cartão inválido',
    'Número do cartão é obrigatório',
    'Validade do cartão é obrigatória',
    'CVV do cartão é obrigatório'
  ])(
    'deve retornar 400 para o erro de validação: %s',
    async (mensagem) => {
      const checkoutService = {
        processar: jest
          .fn()
          .mockRejectedValue(new Error(mensagem))
      };

      const app = createApp({
        checkoutService
      });

      const resposta = await request(app)
        .post('/checkout')
        .send({});

      expect(resposta.status).toBe(400);
      expect(resposta.body).toEqual({
        erro: mensagem
      });
    }
  );

  test('deve retornar erro interno para uma falha inesperada', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const checkoutService = {
      processar: jest
        .fn()
        .mockRejectedValue(
          new Error('Falha inesperada')
        )
    };

    const app = createApp({
      checkoutService
    });

    const resposta = await request(app)
      .post('/checkout')
      .send({});

    expect(resposta.status).toBe(500);

    expect(resposta.body).toEqual({
      erro: 'Erro interno no checkout'
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erro inesperado no checkout:',
      'Falha inesperada'
    );
  });
});
