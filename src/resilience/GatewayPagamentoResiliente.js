class GatewayTimeoutError extends Error {
  constructor(timeoutMs) {
    super(
      `Timeout no gateway de pagamento após ${timeoutMs}ms`
    );

    this.name = 'GatewayTimeoutError';
    this.code = 'GATEWAY_TIMEOUT';
    this.timeoutMs = timeoutMs;
  }
}

class GatewayPagamentoResiliente {
  constructor({
    gatewayPagamento,
    timeoutMs = 2000
  }) {
    this.gatewayPagamento = gatewayPagamento;
    this.timeoutMs = timeoutMs;
  }

  async cobrar(valor, cartao) {
    let identificadorTimeout;

    const chamadaGateway = Promise
      .resolve()
      .then(() =>
        this.gatewayPagamento.cobrar(valor, cartao)
      );

    const limiteDeTempo = new Promise((_, rejeitar) => {
      identificadorTimeout = setTimeout(() => {
        rejeitar(
          new GatewayTimeoutError(this.timeoutMs)
        );
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([
        chamadaGateway,
        limiteDeTempo
      ]);
    } finally {
      clearTimeout(identificadorTimeout);
    }
  }
}

module.exports = {
  GatewayPagamentoResiliente,
  GatewayTimeoutError
};
