const {
  CheckoutService
} = require('../../src/legacy/CheckoutService.legacy');

describe('CheckoutService legado - testes de caracterização', () => {
  let gatewayPagamento;
  let pedidoRepository;
  let emailService;
  let checkoutService;

  beforeEach(() => {
    gatewayPagamento = {
      cobrar: jest.fn()
    };

    pedidoRepository = {
      salvar: jest.fn(async (pedido) => ({
        ...pedido,
        id: 1001
      }))
    };

    emailService = {
      enviarConfirmacao: jest.fn().mockResolvedValue(undefined)
    };

    checkoutService = new CheckoutService(
      gatewayPagamento,
      pedidoRepository,
      emailService
    );
  });

  test('deve processar, salvar e enviar confirmação quando o pagamento for aprovado', async () => {
    gatewayPagamento.cobrar.mockResolvedValue({
      status: 'APROVADO'
    });

    const pedido = {
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      cartao: {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
      },
      status: 'PENDENTE'
    };

    const resultado = await checkoutService.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledWith(
      150,
      pedido.cartao
    );

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PROCESSADO'
      })
    );

    expect(emailService.enviarConfirmacao).toHaveBeenCalledWith(
      'cliente@entregasja.com',
      'Pagamento Aprovado'
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 1001,
        status: 'PROCESSADO'
      })
    );
  });

  test('deve salvar como FALHOU e não enviar e-mail quando o pagamento for recusado', async () => {
    gatewayPagamento.cobrar.mockResolvedValue({
      status: 'RECUSADO'
    });

    const pedido = {
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      cartao: {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
      },
      status: 'PENDENTE'
    };

    const resultado = await checkoutService.processar(pedido);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FALHOU'
      })
    );

    expect(emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('deve salvar como ERRO_GATEWAY quando ocorrer falha de infraestrutura', async () => {
    const erro = new Error('Gateway indisponível');

    gatewayPagamento.cobrar.mockRejectedValue(erro);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const pedido = {
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      cartao: {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
      },
      status: 'PENDENTE'
    };

    const resultado = await checkoutService.processar(pedido);

    expect(consoleErrorSpy).toHaveBeenCalled();

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });
});
