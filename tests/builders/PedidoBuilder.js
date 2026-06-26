class PedidoBuilder {
  constructor() {
    this.pedido = {
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      cartao: {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
      },
      status: 'PENDENTE'
    };
  }

  comEmail(clienteEmail) {
    this.pedido.clienteEmail = clienteEmail;
    return this;
  }

  comValor(valor) {
    this.pedido.valor = valor;
    return this;
  }

  comCartao(cartao) {
    this.pedido.cartao = cartao;
    return this;
  }

  semEmail() {
    delete this.pedido.clienteEmail;
    return this;
  }

  semValor() {
    delete this.pedido.valor;
    return this;
  }

  semCartao() {
    delete this.pedido.cartao;
    return this;
  }

  build() {
    return {
      ...this.pedido,
      cartao: this.pedido.cartao
        ? { ...this.pedido.cartao }
        : this.pedido.cartao
    };
  }
}

module.exports = {
  PedidoBuilder
};
