class CircuitBreakerOpenError extends Error {
  constructor() {
    super('Circuit breaker aberto');

    this.name = 'CircuitBreakerOpenError';
    this.code = 'CIRCUIT_BREAKER_ABERTO';
  }
}

class CircuitBreaker {
  constructor({
    limiteFalhas = 0.5,
    minimoAmostras = 4,
    tempoAbertoMs = 5000,
    agoraFn = () => Date.now()
  } = {}) {
    this.limiteFalhas = limiteFalhas;
    this.minimoAmostras = minimoAmostras;
    this.tempoAbertoMs = tempoAbertoMs;
    this.agoraFn = agoraFn;

    this.estado = 'FECHADO';
    this.totalExecucoes = 0;
    this.totalFalhas = 0;
    this.abertoEm = null;
  }

  verificarPermissao() {
    if (this.estado !== 'ABERTO') {
      return true;
    }

    const tempoDecorrido =
      this.agoraFn() - this.abertoEm;

    if (tempoDecorrido >= this.tempoAbertoMs) {
      this.estado = 'MEIO_ABERTO';
      return true;
    }

    throw new CircuitBreakerOpenError();
  }

  registrarSucesso() {
    if (this.estado === 'MEIO_ABERTO') {
      this.fechar();
      return;
    }

    if (this.estado === 'FECHADO') {
      this.totalExecucoes += 1;
      this.avaliarAbertura();
    }
  }

  registrarFalha() {
    if (this.estado === 'MEIO_ABERTO') {
      this.abrir();
      return;
    }

    if (this.estado === 'FECHADO') {
      this.totalExecucoes += 1;
      this.totalFalhas += 1;
      this.avaliarAbertura();
    }
  }

  avaliarAbertura() {
    if (this.totalExecucoes < this.minimoAmostras) {
      return;
    }

    const taxaFalhas =
      this.totalFalhas / this.totalExecucoes;

    if (taxaFalhas > this.limiteFalhas) {
      this.abrir();
    }
  }

  abrir() {
    this.estado = 'ABERTO';
    this.abertoEm = this.agoraFn();
  }

  fechar() {
    this.estado = 'FECHADO';
    this.totalExecucoes = 0;
    this.totalFalhas = 0;
    this.abertoEm = null;
  }

  obterEstado() {
    return this.estado;
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerOpenError
};
