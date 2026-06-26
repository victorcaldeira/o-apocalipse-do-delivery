class Metricas {
  constructor() {
    this.resetar();
  }

  incrementar(nome, quantidade = 1) {
    this.valores[nome] =
      (this.valores[nome] || 0) + quantidade;
  }

  obter() {
    return {
      ...this.valores,
      coletadoEm: new Date().toISOString()
    };
  }

  resetar() {
    this.valores = {
      requisicoesConsulta: 0,
      leiturasBanco: 0,
      escritasBanco: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheWrites: 0,
      cacheLocalHits: 0,
      cacheErros: 0,
      gatewayChamadas: 0,
      emailsEnviados: 0
    };
  }
}

module.exports = {
  Metricas
};