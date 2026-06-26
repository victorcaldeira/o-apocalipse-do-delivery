class RedisCache {
  constructor({
    client,
    metricas
  }) {
    this.client = client;
    this.metricas = metricas;
  }

  async buscar(chave) {
    const valor = await this.client.get(chave);

    if (valor === null) {
      this.metricas.incrementar('cacheMisses');
      return null;
    }

    this.metricas.incrementar('cacheHits');

    return JSON.parse(valor);
  }

  async salvar(chave, valor, ttlSegundos) {
    await this.client.set(
      chave,
      JSON.stringify(valor),
      {
        EX: ttlSegundos
      }
    );

    this.metricas.incrementar('cacheWrites');
  }

  async limpar() {
    await this.client.flushDb();
  }

  async verificarConexao() {
    const resposta = await this.client.ping();
    return resposta === 'PONG';
  }
}

module.exports = {
  RedisCache
};
