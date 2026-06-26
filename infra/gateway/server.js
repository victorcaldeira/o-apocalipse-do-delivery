const http = require('node:http');

const PORT = Number(process.env.PORT || 8081);

function responderJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json'
  });

  response.end(JSON.stringify(body));
}

function lerCorpo(request) {
  return new Promise((resolve, reject) => {
    let dados = '';

    request.on('data', (parte) => {
      dados += parte;
    });

    request.on('end', () => {
      try {
        resolve(dados ? JSON.parse(dados) : {});
      } catch (erro) {
        reject(erro);
      }
    });

    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (
    request.method === 'GET' &&
    request.url === '/health'
  ) {
    return responderJson(response, 200, {
      status: 'UP',
      servico: 'gateway-pagamento'
    });
  }

  if (
    request.method === 'POST' &&
    request.url === '/cobrar'
  ) {
    try {
      const corpo = await lerCorpo(request);
      const numeroCartao = corpo?.cartao?.numero ?? '';

      const recusado =
        numeroCartao.endsWith('0002');

      return responderJson(response, 200, {
        status: recusado
          ? 'RECUSADO'
          : 'APROVADO',
        transacaoId: `txn-${Date.now()}`
      });
    } catch (erro) {
      return responderJson(response, 400, {
        erro: 'Payload inválido'
      });
    }
  }

  return responderJson(response, 404, {
    erro: 'Rota não encontrada'
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Gateway simulado executando na porta ${PORT}`
  );
});