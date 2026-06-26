import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL =
  __ENV.BASE_URL || 'http://localhost:3000';

http.setResponseCallback(
  http.expectedStatuses(500)
);

const degradacaoControlada =
  new Rate('degradacao_controlada');

const duracaoDegradacao =
  new Trend('duracao_degradacao', true);

export const options = {
  scenarios: {
    gateway_com_latencia: {
      executor: 'constant-vus',
      vus: 5,
      duration: '15s',
      gracefulStop: '10s'
    }
  },

  thresholds: {
    checks: [
      'rate>0.95'
    ],

    http_req_failed: [
      'rate<0.05'
    ],

    http_req_duration: [
      'p(95)<2500'
    ],

    degradacao_controlada: [
      'rate>0.95'
    ],

    duracao_degradacao: [
      'p(95)<2500'
    ]
  }
};

const payload = JSON.stringify({
  clienteEmail: 'cliente@entregasja.com',
  valor: 150,
  cartao: {
    numero: '4111111111111111',
    validade: '12/30',
    cvv: '123'
  }
});

export default function () {
  const resposta = http.post(
    `${BASE_URL}/checkout`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: '15s',
      tags: {
        endpoint: 'checkout_gateway_lento'
      }
    }
  );

  let corpoControlado = false;

  try {
    corpoControlado =
      resposta.json('erro') ===
      'Pagamento não aprovado';
  } catch {
    corpoControlado = false;
  }

  const respostaControlada =
    resposta.status === 500 &&
    corpoControlado;

  degradacaoControlada.add(
    respostaControlada
  );

  duracaoDegradacao.add(
    resposta.timings.duration
  );

  check(resposta, {
    'retorna HTTP 500 controlado': () =>
      resposta.status === 500,

    'retorna mensagem de pagamento não aprovado':
      () => corpoControlado
  });

  sleep(0.1);
}