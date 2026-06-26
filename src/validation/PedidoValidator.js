class PedidoValidator {
  validar(pedido) {
    this.validarEmail(pedido?.clienteEmail);
    this.validarValor(pedido?.valor);
    this.validarCartao(pedido?.cartao);

    return true;
  }

  validarEmail(email) {
    const padraoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      typeof email !== 'string' ||
      !padraoEmail.test(email.trim())
    ) {
      throw new Error('E-mail do cliente inválido');
    }
  }

  validarValor(valor) {
    if (
      typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      throw new Error('Valor do pedido inválido');
    }
  }

  validarCartao(cartao) {
    const cartaoNaoEhObjeto =
      cartao === null ||
      typeof cartao !== 'object' ||
      Array.isArray(cartao);

    if (cartaoNaoEhObjeto) {
      throw new Error('Cartão inválido');
    }

    if (!this.campoPreenchido(cartao.numero)) {
      throw new Error('Número do cartão é obrigatório');
    }

    if (!this.campoPreenchido(cartao.validade)) {
      throw new Error('Validade do cartão é obrigatória');
    }

    if (!this.campoPreenchido(cartao.cvv)) {
      throw new Error('CVV do cartão é obrigatório');
    }
  }

  campoPreenchido(valor) {
    return (
      typeof valor === 'string' &&
      valor.trim().length > 0
    );
  }
}

module.exports = {
  PedidoValidator
};
