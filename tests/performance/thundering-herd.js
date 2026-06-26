import http from 'k6/http';
import { check } from 'k6';

const BASE_URL =
  __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    thundering_herd: {
      executor: 'per-vu-iterations',
      vus: 10000,
      iterations: 1,
      maxDuration: '2m',
      gracefulStop: '0s'
    }
  },

  thresholds: {
    http_req_duration: [
      'p(95)<2500'
    ],

    http_req_failed: [
      'rate<0.05'
    ],

    checks: [
      'rate>0.95'
    ]
  }
};

export default function () {
  const resposta = http.get(
    `${BASE_URL}/pedidos/1001`,
    {
      timeout: '15s',

      tags: {
        endpoint: 'thundering_herd'
      }
    }
  );

  check(resposta, {
    'retorna HTTP 200': (resultado) =>
      resultado.status === 200,

    'retorna o pedido 1001': (resultado) => {
      try {
        return resultado.json('id') === 1001;
      } catch {
        return false;
      }
    }
  });
}