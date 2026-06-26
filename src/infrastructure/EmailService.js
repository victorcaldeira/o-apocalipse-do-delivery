class EmailService {
  constructor({
    metricas
  }) {
    this.metricas = metricas;
  }

  async enviarConfirmacao() {
    this.metricas.incrementar(
      'emailsEnviados'
    );
  }
}

module.exports = {
  EmailService
};
