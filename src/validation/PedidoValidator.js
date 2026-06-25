class PedidoValidator {
  validar(pedido) {
    const email = pedido?.clienteEmail;

    if (
      typeof email !== 'string' ||
      !email.includes('@') ||
      email.startsWith('@') ||
      email.endsWith('@')
    ) {
      throw new Error('E-mail do cliente inválido');
    }

    return true;
  }
}

module.exports = {
  PedidoValidator
};
