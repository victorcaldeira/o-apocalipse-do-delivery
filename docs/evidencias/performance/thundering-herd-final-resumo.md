# Teste de resiliência — Thundering Herd

## Cenário

O Redis foi interrompido após a limpeza dos caches. Em seguida, foram disparadas 10.000 requisições concorrentes para consultar o mesmo pedido.

A aplicação utilizou cache local temporário e compartilhamento da busca em andamento, evitando que todas as requisições acessassem simultaneamente o PostgreSQL.

## SLO

- Percentil 95 inferior a 2.500 ms.
- Taxa de falhas inferior a 5%.
- Taxa de checks aprovados superior a 95%.

## Resultados

- Requisições: 10.000
- Iterações concluídas: 10.000
- Iterações interrompidas: 0
- Checks aprovados: 100%
- Taxa de falhas: 0%
- Tempo médio: 850,43 ms
- Percentil 95: 1,42 s
- Tempo máximo: 1,54 s
- Leituras no PostgreSQL: 1
- Respostas pelo cache local: 9.872
- Erros de Redis tratados: 2
- Código de saída do k6: 0

## Sobrevivência do banco

Após a rajada, o PostgreSQL respondeu normalmente ao comando SELECT 1. A aplicação realizou somente uma leitura no banco durante as 10.000 requisições.

## Conclusão

Todos os thresholds foram aprovados. A estratégia de single-flight, cache local e fallback controlado impediu o efeito Thundering Herd sobre o PostgreSQL. Mesmo com o Redis indisponível, todas as requisições foram atendidas e o banco permaneceu operacional.