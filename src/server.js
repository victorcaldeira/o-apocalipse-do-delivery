const {
  Pool
} = require('pg');

const {
  createClient
} = require('redis');

const {
  PedidoValidator
} = require('./validation/PedidoValidator');

const {
  CheckoutServiceRefactored
} = require('./services/CheckoutServiceRefactored');

const {
  PedidoConsultaService
} = require('./services/PedidoConsultaService');

const {
  GatewayPagamentoResiliente
} = require('./resilience/GatewayPagamentoResiliente');

const {
  CircuitBreaker
} = require('./resilience/CircuitBreaker');

const {
  PostgresPedidoRepository
} = require('./infrastructure/PostgresPedidoRepository');

const {
  RedisCache
} = require('./infrastructure/RedisCache');

const {
  HttpGatewayPagamento
} = require('./infrastructure/HttpGatewayPagamento');

const {
  EmailService
} = require('./infrastructure/EmailService');

const {
  Metricas
} = require('./observability/Metricas');

const {
  createRuntimeApp
} = require('./runtime/createRuntimeApp');

async function iniciar() {
  const metricas = new Metricas();

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL
  });

  const redisClient = createClient({
    url: process.env.REDIS_URL,
    disableOfflineQueue: true,
    socket: {
      reconnectStrategy: (tentativas) => {
        const atrasoExponencial = Math.min(
          100 * (2 ** tentativas),
          2000
        );

        const jitter = Math.floor(
          Math.random() * 100
        );

        return atrasoExponencial + jitter;
      }
    }
  });

  redisClient.on('error', (erro) => {
    console.error(
      'Erro no Redis:',
      erro.message
    );
  });

  await redisClient.connect();
  await pool.query('SELECT 1');

  const pedidoRepository =
    new PostgresPedidoRepository({
      pool,
      metricas
    });

  const cache = new RedisCache({
    client: redisClient,
    metricas
  });

  const gatewayHttp =
    new HttpGatewayPagamento({
      baseUrl: process.env.GATEWAY_URL,
      metricas
    });

  const circuitBreaker =
    new CircuitBreaker({
      limiteFalhas: 0.5,
      minimoAmostras: 4,
      tempoAbertoMs: 5000
    });

  const gatewayResiliente =
    new GatewayPagamentoResiliente({
      gatewayPagamento: gatewayHttp,
      circuitBreaker,
      timeoutMs: Number(
        process.env.GATEWAY_TIMEOUT_MS || 2000
      ),
      maxTentativas: Number(
        process.env.GATEWAY_MAX_TENTATIVAS || 4
      ),
      intervaloEsperaMs: Number(
        process.env.GATEWAY_RETRY_MS || 500
      )
    });

  const checkoutService =
    new CheckoutServiceRefactored({
      gatewayPagamento: gatewayResiliente,
      pedidoRepository,
      emailService: new EmailService({
        metricas
      }),
      pedidoValidator: new PedidoValidator()
    });

  const pedidoConsultaService =
    new PedidoConsultaService({
      pedidoRepository,
      cache,
      ttlSegundos: 60,
      ttlCacheLocalMs: 5000,
      metricas
    });

  const app = createRuntimeApp({
    checkoutService,
    pedidoConsultaService,
    pedidoRepository,
    cache,
    metricas
  });

  const porta = Number(
    process.env.PORT || 3000
  );

  const servidor = app.listen(
    {
      port: porta,
      host: '0.0.0.0',
      backlog: 10000
    },
    () => {
      console.log(
        `Aplicação executando na porta ${porta}`
      );
    }
  );

  async function encerrar() {
    servidor.close();

    await redisClient.quit();
    await pool.end();

    process.exit(0);
  }

  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
}

iniciar().catch((erro) => {
  console.error(
    'Falha ao iniciar aplicação:',
    erro
  );

  process.exit(1);
});
