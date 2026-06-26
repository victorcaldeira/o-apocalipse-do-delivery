const {
  GatewayPagamentoResiliente
} = require('../../src/resilience/GatewayPagamentoResiliente');

describe('GatewayPagamentoResiliente - timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('deve interromper a cobrança quando o gateway exceder 2000ms', async () => {
    const gatewayPagamento = {
      cobrar: jest.fn(() => new Promise(() => {}))
    };

    const gatewayResiliente = new GatewayPagamentoResiliente({
      gatewayPagamento,
      timeoutMs: 2000
    });

    const cobranca = gatewayResiliente.cobrar(
      150,
      {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
      }
    );

    const verificacao = expect(cobranca)
      .rejects
      .toThrow(
        'Timeout no gateway de pagamento após 2000ms'
      );

    await jest.advanceTimersByTimeAsync(2000);
    await verificacao;

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(1);
  });
});
