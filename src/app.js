const express = require('express');

const ERROS_VALIDACAO = new Set([
  'E-mail do cliente inválido',
  'Valor do pedido inválido',
  'Cartão inválido',
  'Número do cartão é obrigatório',
  'Validade do cartão é obrigatória',
  'CVV do cartão é obrigatório'
]);

function createApp({
  checkoutService
}) {
  if (!checkoutService) {
    throw new Error(
      'checkoutService é obrigatório'
    );
  }

  const app = express();

  app.use(express.json());

  app.post('/checkout', async (request, response) => {
    try {
      const resultado =
        await checkoutService.processar(
          request.body
        );

      if (!resultado) {
        return response.status(500).json({
          erro: 'Pagamento não aprovado'
        });
      }

      return response.status(200).json(
        resultado
      );
    } catch (erro) {
      if (ERROS_VALIDACAO.has(erro.message)) {
        return response.status(400).json({
          erro: erro.message
        });
      }

      console.error(
        'Erro inesperado no checkout:',
        erro.message
      );

      return response.status(500).json({
        erro: 'Erro interno no checkout'
      });
    }
  });

  return app;
}

module.exports = {
  createApp
};
