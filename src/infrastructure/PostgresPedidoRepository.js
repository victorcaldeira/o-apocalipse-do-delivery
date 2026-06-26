class PostgresPedidoRepository {
  constructor({
    pool,
    metricas
  }) {
    this.pool = pool;
    this.metricas = metricas;
  }

  async salvar(pedido) {
    this.metricas.incrementar('escritasBanco');

    const resultado = await this.pool.query(
      `
        INSERT INTO pedidos (
          cliente_email,
          valor,
          status
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          cliente_email,
          valor,
          status,
          criado_em
      `,
      [
        pedido.clienteEmail,
        pedido.valor,
        pedido.status
      ]
    );

    return this.mapearPedido(
      resultado.rows[0]
    );
  }

  async buscarPorId(idPedido) {
    this.metricas.incrementar('leiturasBanco');

    const resultado = await this.pool.query(
      `
        SELECT
          id,
          cliente_email,
          valor,
          status,
          criado_em
        FROM pedidos
        WHERE id = $1
      `,
      [idPedido]
    );

    if (resultado.rowCount === 0) {
      return null;
    }

    return this.mapearPedido(
      resultado.rows[0]
    );
  }

  async verificarConexao() {
    await this.pool.query('SELECT 1');
    return true;
  }

  mapearPedido(registro) {
    return {
      id: registro.id,
      clienteEmail: registro.cliente_email,
      valor: Number(registro.valor),
      status: registro.status,
      criadoEm: registro.criado_em
    };
  }
}

module.exports = {
  PostgresPedidoRepository
};
