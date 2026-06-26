class PedidoConsultaService {
  constructor({
    pedidoRepository,
    cache,
    ttlSegundos = 60,
    ttlCacheLocalMs = 5000,
    metricas = null,
    agora = () => Date.now()
  }) {
    this.pedidoRepository = pedidoRepository;
    this.cache = cache;
    this.ttlSegundos = ttlSegundos;
    this.ttlCacheLocalMs = ttlCacheLocalMs;
    this.metricas = metricas;
    this.agora = agora;

    this.buscasEmAndamento = new Map();
    this.cacheLocal = new Map();
  }

  async buscarPorId(idPedido) {
    const chave = `pedido:${idPedido}`;

    const pedidoLocal =
      this.buscarNoCacheLocal(chave);

    if (pedidoLocal !== null) {
      this.incrementarMetrica(
        'cacheLocalHits'
      );

      return pedidoLocal;
    }

    if (this.buscasEmAndamento.has(chave)) {
      return this.buscasEmAndamento.get(
        chave
      );
    }

    const busca = Promise.resolve().then(
      () => this.carregarPedido(
        chave,
        idPedido
      )
    );

    this.buscasEmAndamento.set(
      chave,
      busca
    );

    try {
      return await busca;
    } finally {
      this.buscasEmAndamento.delete(chave);
    }
  }

  async carregarPedido(chave, idPedido) {
    const pedidoDistribuido =
      await this.buscarNoCacheDistribuido(
        chave
      );

    if (pedidoDistribuido !== null) {
      this.salvarNoCacheLocal(
        chave,
        pedidoDistribuido
      );

      return pedidoDistribuido;
    }

    return this.buscarNoBanco(
      chave,
      idPedido
    );
  }

  async buscarNoCacheDistribuido(chave) {
    try {
      return await this.cache.buscar(chave);
    } catch (_erro) {
      this.incrementarMetrica(
        'cacheErros'
      );

      return null;
    }
  }

  buscarNoCacheLocal(chave) {
    const registro =
      this.cacheLocal.get(chave);

    if (!registro) {
      return null;
    }

    if (registro.expiraEm <= this.agora()) {
      this.cacheLocal.delete(chave);
      return null;
    }

    return registro.valor;
  }

  salvarNoCacheLocal(chave, valor) {
    this.cacheLocal.set(chave, {
      valor,
      expiraEm:
        this.agora() + this.ttlCacheLocalMs
    });
  }

  async buscarNoBanco(chave, idPedido) {
    const pedido =
      await this.pedidoRepository.buscarPorId(
        idPedido
      );

    if (!pedido) {
      return null;
    }

    this.salvarNoCacheLocal(
      chave,
      pedido
    );

    try {
      await this.cache.salvar(
        chave,
        pedido,
        this.ttlSegundos
      );
    } catch (_erro) {
      this.incrementarMetrica(
        'cacheErros'
      );
    }

    return pedido;
  }

  limparCacheLocal() {
    this.cacheLocal.clear();
  }

  incrementarMetrica(nome) {
    if (
      this.metricas &&
      typeof this.metricas.incrementar ===
        'function'
    ) {
      this.metricas.incrementar(nome);
    }
  }
}

module.exports = {
  PedidoConsultaService
};