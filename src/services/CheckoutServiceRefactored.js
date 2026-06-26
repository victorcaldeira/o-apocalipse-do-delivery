class CheckoutServiceRefactored {
  constructor({
    gatewayPagamento,
    pedidoRepository,
    emailService,
    pedidoValidator
  }) {
    this.gatewayPagamento = gatewayPagamento;
    this.pedidoRepository = pedidoRepository;
    this.emailService = emailService;
    this.pedidoValidator = pedidoValidator;
  }

  async processar(pedido) {
    this.pedidoValidator.validar(pedido);

    let respostaPagamento;

    try {
      respostaPagamento =
        await this.gatewayPagamento.cobrar(
          pedido.valor,
          pedido.cartao
        );
    } catch (erro) {
      return this.processarErroGateway(pedido, erro);
    }

    if (respostaPagamento.status === 'APROVADO') {
      return this.processarPagamentoAprovado(pedido);
    }

    return this.processarPagamentoRecusado(pedido);
  }

  async processarPagamentoAprovado(pedido) {
    const pedidoProcessado = this.criarPedidoComStatus(
      pedido,
      'PROCESSADO'
    );

    const pedidoSalvo =
      await this.pedidoRepository.salvar(pedidoProcessado);

    this.enviarConfirmacaoSemBloquear(pedidoSalvo);

    return pedidoSalvo;
  }

  async processarPagamentoRecusado(pedido) {
    const pedidoRecusado = this.criarPedidoComStatus(
      pedido,
      'FALHOU'
    );

    await this.pedidoRepository.salvar(pedidoRecusado);

    return null;
  }

  async processarErroGateway(pedido, erro) {
    console.error(
      'Falha no gateway de pagamento:',
      erro.message
    );

    const pedidoComErro = this.criarPedidoComStatus(
      pedido,
      'ERRO_GATEWAY'
    );

    await this.pedidoRepository.salvar(pedidoComErro);

    return null;
  }

  criarPedidoComStatus(pedido, status) {
    return {
      ...pedido,
      cartao: {
        ...pedido.cartao
      },
      status
    };
  }

  enviarConfirmacaoSemBloquear(pedido) {
    try {
      const envio = this.emailService.enviarConfirmacao(
        pedido.clienteEmail,
        'Pagamento Aprovado'
      );

      Promise.resolve(envio).catch((erro) => {
        console.error(
          'Falha ao enviar confirmação:',
          erro.message
        );
      });
    } catch (erro) {
      console.error(
        'Falha ao enviar confirmação:',
        erro.message
      );
    }
  }
}

module.exports = {
  CheckoutServiceRefactored
};
