const {
  GatewayPagamentoResiliente,
  GatewayTimeoutError
} = require(
  '../../src/resilience/GatewayPagamentoResiliente'
);

describe('GatewayPagamentoResiliente - casos complementares', () => {
  const cartao = {
    numero: '4111111111111111',
    validade: '12/30',
    cvv: '123'
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function criarCircuitBreakerMock() {
    return {
      verificarPermissao: jest.fn(),
      registrarSucesso: jest.fn(),
      registrarFalha: jest.fn()
    };
  }

  test('deve criar erro de timeout com propriedades identificáveis', () => {
    const erro = new GatewayTimeoutError(2000);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.name).toBe('GatewayTimeoutError');
    expect(erro.code).toBe('GATEWAY_TIMEOUT');
    expect(erro.timeoutMs).toBe(2000);
    expect(erro.message).toBe(
      'Timeout no gateway de pagamento após 2000ms'
    );
  });

  test.each([
    [new GatewayTimeoutError(2000), true],
    [{ code: 'ECONNRESET' }, true],
    [{ code: 'ECONNREFUSED' }, true],
    [{ code: 'ETIMEDOUT' }, true],
    [{ code: 'EHOSTUNREACH' }, true],
    [{ code: 'ENETUNREACH' }, true],
    [{ code: 'ERRO_NEGOCIO' }, false],
    [new Error('Erro sem código'), false],
    [null, false]
  ])(
    'deve classificar corretamente uma falha transitória',
    (erro, esperado) => {
      const service =
        new GatewayPagamentoResiliente({
          gatewayPagamento: {
            cobrar: jest.fn()
          }
        });

      expect(
        service.ehFalhaTransitoria(erro)
      ).toBe(esperado);
    }
  );

  test('deve registrar falha transitória no circuit breaker', async () => {
    const erro = Object.assign(
      new Error('Conexão reiniciada'),
      {
        code: 'ECONNRESET'
      }
    );

    const circuitBreaker =
      criarCircuitBreakerMock();

    const gatewayPagamento = {
      cobrar: jest
        .fn()
        .mockRejectedValue(erro)
    };

    const service =
      new GatewayPagamentoResiliente({
        gatewayPagamento,
        circuitBreaker,
        maxTentativas: 1
      });

    await expect(
      service.cobrar(150, cartao)
    ).rejects.toBe(erro);

    expect(
      circuitBreaker.registrarFalha
    ).toHaveBeenCalledTimes(1);

    expect(
      circuitBreaker.registrarSucesso
    ).not.toHaveBeenCalled();
  });

  test('não deve registrar falha nem repetir erro de negócio', async () => {
    const erro = Object.assign(
      new Error('Cartão bloqueado'),
      {
        code: 'CARTAO_BLOQUEADO'
      }
    );

    const circuitBreaker =
      criarCircuitBreakerMock();

    const esperaFn = jest
      .fn()
      .mockResolvedValue(undefined);

    const gatewayPagamento = {
      cobrar: jest
        .fn()
        .mockRejectedValue(erro)
    };

    const service =
      new GatewayPagamentoResiliente({
        gatewayPagamento,
        circuitBreaker,
        maxTentativas: 4,
        esperaFn
      });

    await expect(
      service.cobrar(150, cartao)
    ).rejects.toBe(erro);

    expect(gatewayPagamento.cobrar)
      .toHaveBeenCalledTimes(1);

    expect(circuitBreaker.registrarFalha)
      .not
      .toHaveBeenCalled();

    expect(esperaFn).not.toHaveBeenCalled();
  });

  test('deve registrar sucesso no circuit breaker', async () => {
    const circuitBreaker =
      criarCircuitBreakerMock();

    const gatewayPagamento = {
      cobrar: jest.fn().mockResolvedValue({
        status: 'APROVADO'
      })
    };

    const service =
      new GatewayPagamentoResiliente({
        gatewayPagamento,
        circuitBreaker,
        maxTentativas: 1
      });

    await expect(
      service.cobrar(150, cartao)
    ).resolves.toEqual({
      status: 'APROVADO'
    });

    expect(
      circuitBreaker.registrarSucesso
    ).toHaveBeenCalledTimes(1);

    expect(
      circuitBreaker.registrarFalha
    ).not.toHaveBeenCalled();
  });

  test('deve limpar o temporizador após resposta rápida', async () => {
    const clearTimeoutSpy = jest.spyOn(
      global,
      'clearTimeout'
    );

    const gatewayPagamento = {
      cobrar: jest.fn().mockResolvedValue({
        status: 'APROVADO'
      })
    };

    const service =
      new GatewayPagamentoResiliente({
        gatewayPagamento,
        maxTentativas: 1,
        timeoutMs: 2000
      });

    await service.cobrar(150, cartao);

    expect(clearTimeoutSpy)
      .toHaveBeenCalledTimes(1);
  });

  test('deve usar a espera padrão antes de repetir a chamada', async () => {
    const setTimeoutSpy = jest.spyOn(
      global,
      'setTimeout'
    );

    const erro = Object.assign(
      new Error('Conexão reiniciada'),
      {
        code: 'ECONNRESET'
      }
    );

    const gatewayPagamento = {
      cobrar: jest
        .fn()
        .mockRejectedValueOnce(erro)
        .mockResolvedValueOnce({
          status: 'APROVADO'
        })
    };

    const service =
      new GatewayPagamentoResiliente({
        gatewayPagamento,
        maxTentativas: 2,
        intervaloEsperaMs: 1,
        timeoutMs: 2000
      });

    const resultado = await service.cobrar(
      150,
      cartao
    );

    expect(resultado).toEqual({
      status: 'APROVADO'
    });

    expect(gatewayPagamento.cobrar)
      .toHaveBeenCalledTimes(2);

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      expect.any(Function),
      1
    );
  });
});
