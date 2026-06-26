const {
  createApp
} = require('../app');

function createRuntimeApp({
  checkoutService,
  pedidoConsultaService,
  pedidoRepository,
  cache,
  metricas
}) {
  const app = createApp({
    checkoutService
  });

  app.get('/health', async (_request, response) => {
    try {
      await Promise.all([
        pedidoRepository.verificarConexao(),
        cache.verificarConexao()
      ]);

      return response.status(200).json({
        status: 'UP',
        postgres: 'UP',
        redis: 'UP'
      });
    } catch (erro) {
      return response.status(503).json({
        status: 'DOWN',
        erro: erro.message
      });
    }
  });

  app.get('/pedidos/:id', async (
    request,
    response
  ) => {
    const idPedido = Number(
      request.params.id
    );

    if (
      !Number.isInteger(idPedido) ||
      idPedido <= 0
    ) {
      return response.status(400).json({
        erro: 'Identificador de pedido inválido'
      });
    }

    metricas.incrementar(
      'requisicoesConsulta'
    );

    try {
      const pedido =
        await pedidoConsultaService.buscarPorId(
          idPedido
        );

      if (!pedido) {
        return response.status(404).json({
          erro: 'Pedido não encontrado'
        });
      }

      return response.status(200).json(
        pedido
      );
    } catch (erro) {
      console.error(
        'Erro ao consultar pedido:',
        erro.message
      );

      return response.status(503).json({
        erro:
          'Consulta temporariamente indisponível'
      });
    }
  });

  app.post('/admin/cache/flush', async (
    _request,
    response
  ) => {
    pedidoConsultaService.limparCacheLocal();

    try {
      await cache.limpar();

      return response.status(200).json({
        mensagem:
          'Caches Redis e local limpos com sucesso'
      });
    } catch (erro) {
      return response.status(200).json({
        mensagem:
          'Cache local limpo; Redis indisponível',
        degradado: true
      });
    }
  });

  app.post('/admin/metrics/reset', (
    _request,
    response
  ) => {
    metricas.resetar();

    return response.status(200).json({
      mensagem: 'Métricas reiniciadas'
    });
  });

  app.get('/admin/metrics', (
    _request,
    response
  ) => {
    return response.status(200).json(
      metricas.obter()
    );
  });

  return app;
}

module.exports = {
  createRuntimeApp
};