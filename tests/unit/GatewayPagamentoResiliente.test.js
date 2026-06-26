const {
  GatewayPagamentoResiliente
} = require('../../src/resilience/GatewayPagamentoResiliente');

describe('GatewayPagamentoResiliente', () => {
  describe('timeout', () => {
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
        timeoutMs: 2000,
        maxTentativas: 1
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

  describe('retry', () => {
    test('deve tentar novamente após falhas transitórias e retornar sucesso', async () => {
      const primeiraFalha = Object.assign(
        new Error('Conexão reiniciada'),
        { code: 'ECONNRESET' }
      );

      const segundaFalha = Object.assign(
        new Error('Conexão recusada'),
        { code: 'ECONNREFUSED' }
      );

      const gatewayPagamento = {
        cobrar: jest
          .fn()
          .mockRejectedValueOnce(primeiraFalha)
          .mockRejectedValueOnce(segundaFalha)
          .mockResolvedValueOnce({
            status: 'APROVADO'
          })
      };

      const esperaFn = jest
        .fn()
        .mockResolvedValue(undefined);

      const gatewayResiliente = new GatewayPagamentoResiliente({
        gatewayPagamento,
        timeoutMs: 2000,
        maxTentativas: 4,
        intervaloEsperaMs: 500,
        esperaFn
      });

      const resultado = await gatewayResiliente.cobrar(
        150,
        {
          numero: '4111111111111111',
          validade: '12/30',
          cvv: '123'
        }
      );

      expect(resultado).toEqual({
        status: 'APROVADO'
      });

      expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(3);

      expect(esperaFn).toHaveBeenCalledTimes(2);
      expect(esperaFn).toHaveBeenNthCalledWith(1, 500);
      expect(esperaFn).toHaveBeenNthCalledWith(2, 500);
    });

    test('deve encerrar após quatro tentativas com falha', async () => {
      const erroGateway = Object.assign(
        new Error('Gateway indisponível'),
        { code: 'ECONNRESET' }
      );

      const gatewayPagamento = {
        cobrar: jest.fn().mockRejectedValue(erroGateway)
      };

      const esperaFn = jest
        .fn()
        .mockResolvedValue(undefined);

      const gatewayResiliente = new GatewayPagamentoResiliente({
        gatewayPagamento,
        timeoutMs: 2000,
        maxTentativas: 4,
        intervaloEsperaMs: 500,
        esperaFn
      });

      await expect(
        gatewayResiliente.cobrar(
          150,
          {
            numero: '4111111111111111',
            validade: '12/30',
            cvv: '123'
          }
        )
      ).rejects.toBe(erroGateway);

      expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(4);
      expect(esperaFn).toHaveBeenCalledTimes(3);
    });
  });
});
