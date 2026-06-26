const assert = require('node:assert/strict');

const {
  Before,
  After,
  Given,
  When,
  Then
} = require('@cucumber/cucumber');

const {
  CheckoutServiceRefactored
} = require('../../src/services/CheckoutServiceRefactored');

const {
  PedidoValidator
} = require('../../src/validation/PedidoValidator');

const {
  GatewayTimeoutError
} = require('../../src/resilience/GatewayPagamentoResiliente');

const {
  PedidoBuilder
} = require('../../tests/builders/PedidoBuilder');

Before(function () {
  this.pedidosSalvos = [];
  this.emailsEnviados = [];
  this.resultado = undefined;

  this.gatewayPagamento = {
    cobrar: async () => {
      throw new Error('Comportamento do gateway não configurado');
    }
  };

  this.pedidoRepository = {
    salvar: async (pedido) => {
      const pedidoSalvo = {
        ...pedido,
        cartao: {
          ...pedido.cartao
        },
        id: 1001
      };

      this.pedidosSalvos.push(pedidoSalvo);

      return pedidoSalvo;
    }
  };

  this.emailService = {
    enviarConfirmacao: async (email, assunto) => {
      this.emailsEnviados.push({
        email,
        assunto
      });
    }
  };

  this.checkoutService = new CheckoutServiceRefactored({
    gatewayPagamento: this.gatewayPagamento,
    pedidoRepository: this.pedidoRepository,
    emailService: this.emailService,
    pedidoValidator: new PedidoValidator()
  });

  this.consoleErrorOriginal = console.error;
  console.error = () => {};
});

After(function () {
  console.error = this.consoleErrorOriginal;
});

Given('que existe um pedido válido', function () {
  this.pedido = new PedidoBuilder().build();
});

Given('que o gateway aprova o pagamento', function () {
  this.gatewayPagamento.cobrar = async () => ({
    status: 'APROVADO'
  });
});

Given('que o gateway recusa o pagamento', function () {
  this.gatewayPagamento.cobrar = async () => ({
    status: 'RECUSADO'
  });
});

Given(
  'que o gateway excede o limite de 2 segundos',
  function () {
    this.gatewayPagamento.cobrar = async () => {
      throw new GatewayTimeoutError(2000);
    };
  }
);

Given(
  'que o gateway apresenta uma falha de infraestrutura',
  function () {
    this.gatewayPagamento.cobrar = async () => {
      throw Object.assign(
        new Error('Gateway indisponível'),
        {
          code: 'ECONNRESET'
        }
      );
    };
  }
);

When('o checkout for processado', async function () {
  this.resultado = await this.checkoutService.processar(
    this.pedido
  );

  await new Promise((resolve) => {
    setImmediate(resolve);
  });
});

Then(
  'o pedido deve ser salvo com o status {string}',
  function (statusEsperado) {
    assert.equal(this.pedidosSalvos.length, 1);

    assert.equal(
      this.pedidosSalvos[0].status,
      statusEsperado
    );
  }
);

Then(
  'o checkout deve retornar o pedido processado',
  function () {
    assert.ok(this.resultado);

    assert.equal(
      this.resultado.status,
      'PROCESSADO'
    );

    assert.equal(
      this.resultado.id,
      1001
    );
  }
);

Then(
  'o checkout deve retornar uma falha controlada',
  function () {
    assert.equal(this.resultado, null);
  }
);

Then(
  'o e-mail de confirmação deve ser enviado',
  function () {
    assert.equal(this.emailsEnviados.length, 1);

    assert.deepEqual(
      this.emailsEnviados[0],
      {
        email: this.pedido.clienteEmail,
        assunto: 'Pagamento Aprovado'
      }
    );
  }
);

Then(
  'o e-mail de confirmação não deve ser enviado',
  function () {
    assert.equal(this.emailsEnviados.length, 0);
  }
);
