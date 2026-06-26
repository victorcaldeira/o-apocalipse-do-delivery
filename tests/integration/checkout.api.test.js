const request = require('supertest');

const {
  createApp
} = require('../../src/app');

const {
  CheckoutServiceRefactored
} = require('../../src/services/CheckoutServiceRefactored');

const {
  PedidoValidator
} = require('../../src/validation/PedidoValidator');

const {
  PedidoBuilder
} = require('../builders/PedidoBuilder');

describe('POST /checkout', () => {
  let gatewayStub;
  let repositoryStub;
  let emailMock;
  let app;

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
      enviarConfirmacao: jest
        .fn()
        .mockResolvedValue(undefined)
    };

    const checkoutService =
      new CheckoutServiceRefactored({
        gatewayPagamento: gatewayStub,
        pedidoRepository: repositoryStub,
        emailService: emailMock,
        pedidoValidator: new PedidoValidator()
      });

    app = createApp({
      checkoutService
    });
  });

  test('deve retornar 200 quando o pagamento for aprovado', async () => {
    gatewayStub.cobrar.mockResolvedValue({
      status: 'APROVADO'
    });

    const pedido = new PedidoBuilder().build();

    const resposta = await request(app)
      .post('/checkout')
      .send(pedido);

    expect(resposta.status).toBe(200);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        id: 1001,
        status: 'PROCESSADO',
        clienteEmail: pedido.clienteEmail,
        valor: pedido.valor
      })
    );

    expect(repositoryStub.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PROCESSADO'
      })
    );

    expect(emailMock.enviarConfirmacao)
      .toHaveBeenCalledTimes(1);
  });

  test('deve retornar 400 sem chamar dependências quando o pedido for inválido', async () => {
    const pedido = new PedidoBuilder()
      .comEmail('email-invalido')
      .build();

    const resposta = await request(app)
      .post('/checkout')
      .send(pedido);

    expect(resposta.status).toBe(400);

    expect(resposta.body).toEqual({
      erro: 'E-mail do cliente inválido'
    });

    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
    expect(repositoryStub.salvar).not.toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao)
      .not
      .toHaveBeenCalled();
  });

  test('deve retornar 500 quando o pagamento for recusado', async () => {
    gatewayStub.cobrar.mockResolvedValue({
      status: 'RECUSADO'
    });

    const pedido = new PedidoBuilder().build();

    const resposta = await request(app)
      .post('/checkout')
      .send(pedido);

    expect(resposta.status).toBe(500);

    expect(resposta.body).toEqual({
      erro: 'Pagamento não aprovado'
    });

    expect(repositoryStub.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FALHOU'
      })
    );

    expect(emailMock.enviarConfirmacao)
      .not
      .toHaveBeenCalled();
  });

  test('deve retornar 500 quando ocorrer erro no gateway', async () => {
    jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const erroGateway = Object.assign(
      new Error('Gateway indisponível'),
      {
        code: 'ECONNRESET'
      }
    );

    gatewayStub.cobrar.mockRejectedValue(
      erroGateway
    );

    const pedido = new PedidoBuilder().build();

    const resposta = await request(app)
      .post('/checkout')
      .send(pedido);

    expect(resposta.status).toBe(500);

    expect(resposta.body).toEqual({
      erro: 'Pagamento não aprovado'
    });

    expect(repositoryStub.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(emailMock.enviarConfirmacao)
      .not
      .toHaveBeenCalled();
  });
});
