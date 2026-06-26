import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    black_friday: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '10s', target: 50 },
        { duration: '20s', target: 50 },
        { duration: '10s', target: 0 }
      ],
      gracefulRampDown: '10s'
    }
  },

  thresholds: {
    http_req_duration: ['p(95)<2500'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95']
  }
};

export default function () {
  const resposta = http.get(
    `${BASE_URL}/pedidos/1001`,
    {
      tags: {
        endpoint: 'consulta_pedido'
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

  sleep(0.2);
}