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
    timeoutMs = 2000,
    maxTentativas = 4,
    intervaloEsperaMs = 500,
    esperaFn
  }) {
    this.gatewayPagamento = gatewayPagamento;
    this.timeoutMs = timeoutMs;
    this.maxTentativas = maxTentativas;
    this.intervaloEsperaMs = intervaloEsperaMs;

    this.esperaFn =
      esperaFn ||
      ((tempoMs) =>
        new Promise((resolve) => {
          setTimeout(resolve, tempoMs);
        }));
  }

  async cobrar(valor, cartao) {
    let ultimaFalha;

    for (
      let tentativa = 1;
      tentativa <= this.maxTentativas;
      tentativa += 1
    ) {
      try {
        return await this.executarComTimeout(
          valor,
          cartao
        );
      } catch (erro) {
        ultimaFalha = erro;

        const possuiNovaTentativa =
          tentativa < this.maxTentativas;

        const deveTentarNovamente =
          possuiNovaTentativa &&
          this.ehFalhaTransitoria(erro);

        if (!deveTentarNovamente) {
          throw erro;
        }

        await this.esperaFn(
          this.intervaloEsperaMs
        );
      }
    }

    throw ultimaFalha;
  }

  async executarComTimeout(valor, cartao) {
    let identificadorTimeout;

    const chamadaGateway = Promise
      .resolve()
      .then(() =>
        this.gatewayPagamento.cobrar(
          valor,
          cartao
        )
      );

    const limiteDeTempo = new Promise(
      (_, rejeitar) => {
        identificadorTimeout = setTimeout(() => {
          rejeitar(
            new GatewayTimeoutError(
              this.timeoutMs
            )
          );
        }, this.timeoutMs);
      }
    );

    try {
      return await Promise.race([
        chamadaGateway,
        limiteDeTempo
      ]);
    } finally {
      clearTimeout(identificadorTimeout);
    }
  }

  ehFalhaTransitoria(erro) {
    if (erro instanceof GatewayTimeoutError) {
      return true;
    }

    const codigosTransitorios = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH'
    ];

    return codigosTransitorios.includes(
      erro?.code
    );
  }
}

module.exports = {
  GatewayPagamentoResiliente,
  GatewayTimeoutError
};
