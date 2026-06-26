class HttpGatewayPagamento {
  constructor({
    baseUrl,
    metricas
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.metricas = metricas;
  }

  async cobrar(valor, cartao) {
    this.metricas.incrementar('gatewayChamadas');

    try {
      const resposta = await fetch(
        `${this.baseUrl}/cobrar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            valor,
            cartao
          })
        }
      );

      if (!resposta.ok) {
        const erro = new Error(
          `Gateway retornou HTTP ${resposta.status}`
        );

        erro.code = 'GATEWAY_HTTP_ERROR';
        throw erro;
      }

      return resposta.json();
    } catch (erro) {
      if (erro.code) {
        throw erro;
      }

      const codigoOriginal =
        erro.cause?.code;

      const mapeamento = {
        UND_ERR_CONNECT_TIMEOUT: 'ETIMEDOUT',
        ECONNREFUSED: 'ECONNREFUSED',
        ECONNRESET: 'ECONNRESET',
        ETIMEDOUT: 'ETIMEDOUT',
        EHOSTUNREACH: 'EHOSTUNREACH',
        ENETUNREACH: 'ENETUNREACH'
      };

      erro.code =
        mapeamento[codigoOriginal] ||
        'ECONNRESET';

      throw erro;
    }
  }
}

module.exports = {
  HttpGatewayPagamento
};
