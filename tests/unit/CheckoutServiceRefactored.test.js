const {
  CheckoutServiceRefactored
} = require('../../src/services/CheckoutServiceRefactored');

const {
  PedidoValidator
} = require('../../src/validation/PedidoValidator');

const {
  PedidoBuilder
} = require('../builders/PedidoBuilder');

describe('CheckoutServiceRefactored', () => {
  let gatewayStub;
  let repositoryStub;
  let emailMock;
  let checkoutService;

  beforeEach(() => {
    gatewayStub = {
      cobrar: jest.fn()
    };

    repositoryStub = {
      salvar: jest.fn(async (pedido) => ({
        ...pedido,
        id: 1001
      }))
    };

    emailMock = {
      enviarConfirmacao: jest.fn().mockResolvedValue(undefined)
    };

    checkoutService = new CheckoutServiceRefactored({
      gatewayPagamento: gatewayStub,
      pedidoRepository: repositoryStub,
      emailService: emailMock,
      pedidoValidator: new PedidoValidator()
    });
  });

  test('não deve chamar dependências quando o pedido for inválido', async () => {
    const pedido = new PedidoBuilder()
      .comEmail('email-invalido')
      .build();

    await expect(checkoutService.processar(pedido))
      .rejects
      .toThrow('E-mail do cliente inválido');

    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
    expect(repositoryStub.salvar).not.toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
  });

  test('deve processar, salvar e notificar quando o pagamento for aprovado', async () => {
    gatewayStub.cobrar.mockResolvedValue({
      status: 'APROVADO'
    });

    const pedido = new PedidoBuilder().build();

    const resultado = await checkoutService.processar(pedido);

    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);
    expect(gatewayStub.cobrar).toHaveBeenCalledWith(
      pedido.valor,
      pedido.cartao
    );

    expect(repositoryStub.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PROCESSADO'
      })
    );

    expect(emailMock.enviarConfirmacao).toHaveBeenCalledTimes(1);
    expect(emailMock.enviarConfirmacao).toHaveBeenCalledWith(
      pedido.clienteEmail,
      'Pagamento Aprovado'
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 1001,
        status: 'PROCESSADO'
      })
    );

    expect(pedido.status).toBe('PENDENTE');
  });

  test('deve salvar como FALHOU e não enviar e-mail quando o pagamento for recusado', async () => {
    gatewayStub.cobrar.mockResolvedValue({
      status: 'RECUSADO'
    });

    const pedido = new PedidoBuilder().build();

    const resultado = await checkoutService.processar(pedido);

    expect(repositoryStub.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FALHOU'
      })
    );

    expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
    expect(pedido.status).toBe('PENDENTE');
  });

  test('falha no e-mail não deve alterar o resultado do checkout', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    gatewayStub.cobrar.mockResolvedValue({
      status: 'APROVADO'
    });

    emailMock.enviarConfirmacao.mockRejectedValue(
      new Error('Servidor de e-mail indisponível')
    );

    const pedido = new PedidoBuilder().build();

    const resultado = await checkoutService.processar(pedido);

    await new Promise((resolve) => setImmediate(resolve));

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 1001,
        status: 'PROCESSADO'
      })
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Falha ao enviar confirmação:',
      'Servidor de e-mail indisponível'
    );
  });

  test('deve salvar como ERRO_GATEWAY quando ocorrer falha de infraestrutura', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    gatewayStub.cobrar.mockRejectedValue(
      new Error('ECONNRESET')
    );

    const pedido = new PedidoBuilder().build();

    const resultado = await checkoutService.processar(pedido);

    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);

    expect(repositoryStub.salvar).toHaveBeenCalledTimes(1);
    expect(repositoryStub.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
    expect(pedido.status).toBe('PENDENTE');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Falha no gateway de pagamento:',
      'ECONNRESET'
    );
  });
});

