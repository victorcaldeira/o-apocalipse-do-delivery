class PedidoConsultaService {
  constructor({
    pedidoRepository,
    cache,
    ttlSegundos = 60
  }) {
    this.pedidoRepository = pedidoRepository;
    this.cache = cache;
    this.ttlSegundos = ttlSegundos;
    this.consultasEmAndamento = new Map();
  }

  async buscarPorId(idPedido) {
    const chaveCache = this.criarChaveCache(idPedido);

    const pedidoEmCache = await this.cache.buscar(
      chaveCache
    );

    if (pedidoEmCache) {
      return pedidoEmCache;
    }

    if (this.consultasEmAndamento.has(chaveCache)) {
      return this.consultasEmAndamento.get(
        chaveCache
      );
    }

    const consulta = this.buscarNoBancoEAtualizarCache(
      idPedido,
      chaveCache
    );

    this.consultasEmAndamento.set(
      chaveCache,
      consulta
    );

    try {
      return await consulta;
    } finally {
      this.consultasEmAndamento.delete(
        chaveCache
      );
    }
  }

  async buscarNoBancoEAtualizarCache(
    idPedido,
    chaveCache
  ) {
    const pedido =
      await this.pedidoRepository.buscarPorId(
        idPedido
      );

    if (pedido) {
      await this.cache.salvar(
        chaveCache,
        pedido,
        this.ttlSegundos
      );
    }

    return pedido;
  }

  criarChaveCache(idPedido) {
    return `pedido:${idPedido}`;
  }
}

module.exports = {
  PedidoConsultaService
};
