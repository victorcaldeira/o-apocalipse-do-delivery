const {
  PedidoConsultaService
} = require('../../src/services/PedidoConsultaService');

describe('PedidoConsultaService', () => {
  test('deve agrupar consultas simultâneas quando o cache estiver vazio', async () => {
    const pedido = {
      id: 1001,
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      status: 'PROCESSADO'
    };

    const cacheStub = {
      buscar: jest.fn().mockResolvedValue(null),
      salvar: jest.fn().mockResolvedValue(undefined)
    };

    const pedidoRepositoryStub = {
      buscarPorId: jest.fn(async () => {
        await new Promise((resolve) => {
          setImmediate(resolve);
        });

        return pedido;
      })
    };

    const service = new PedidoConsultaService({
      pedidoRepository: pedidoRepositoryStub,
      cache: cacheStub,
      ttlSegundos: 60
    });

    const consultas = Array.from(
      { length: 100 },
      () => service.buscarPorId(1001)
    );

    const resultados = await Promise.all(consultas);

    expect(resultados).toHaveLength(100);

    resultados.forEach((resultado) => {
      expect(resultado).toEqual(pedido);
    });

    expect(
      pedidoRepositoryStub.buscarPorId
    ).toHaveBeenCalledTimes(1);

    expect(
      pedidoRepositoryStub.buscarPorId
    ).toHaveBeenCalledWith(1001);

    expect(cacheStub.salvar).toHaveBeenCalledTimes(1);

    expect(cacheStub.salvar).toHaveBeenCalledWith(
      'pedido:1001',
      pedido,
      60
    );
  });

  test('deve retornar o pedido do cache sem consultar o banco', async () => {
    const pedidoEmCache = {
      id: 1001,
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      status: 'PROCESSADO'
    };

    const cacheStub = {
      buscar: jest.fn().mockResolvedValue(pedidoEmCache),
      salvar: jest.fn()
    };

    const pedidoRepositoryStub = {
      buscarPorId: jest.fn()
    };

    const service = new PedidoConsultaService({
      pedidoRepository: pedidoRepositoryStub,
      cache: cacheStub,
      ttlSegundos: 60
    });

    const resultado = await service.buscarPorId(1001);

    expect(resultado).toEqual(pedidoEmCache);

    expect(cacheStub.buscar).toHaveBeenCalledWith(
      'pedido:1001'
    );

    expect(
      pedidoRepositoryStub.buscarPorId
    ).not.toHaveBeenCalled();

    expect(cacheStub.salvar).not.toHaveBeenCalled();
  });
});
