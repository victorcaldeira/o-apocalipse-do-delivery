# Teste de caos — Gateway de pagamento lento

## Cenário

Foi adicionada uma latência de 5.000 ms ao gateway de pagamento por meio do Toxiproxy. A aplicação estava configurada com timeout de 2.000 ms, novas tentativas e circuit breaker.

## SLO

- Percentil 95 inferior a 2.500 ms.
- Taxa de falhas inesperadas inferior a 5%.
- Taxa de checks aprovados superior a 95%.
- Degradação controlada superior a 95%.

## Resultado durante a falha

- Requisições executadas: 435
- Iterações interrompidas: 0
- Checks aprovados: 100%
- Degradação controlada: 100%
- Falhas HTTP inesperadas: 0%
- Tempo médio: 90,83 ms
- Percentil 95: 10,4 ms
- Tempo máximo: 2,52 s
- Persistências no PostgreSQL: 435
- Chamadas reais ao gateway: 15
- E-mails enviados: 0
- Código de saída do k6: 0

O circuit breaker evitou 420 chamadas ao gateway, equivalente a aproximadamente 96,55% das 435 operações.

## Recuperação

Após a remoção da latência e espera de seis segundos:

- O checkout retornou HTTP 200.
- O pedido 1440 foi salvo como PROCESSADO.
- As escritas no banco passaram de 435 para 436.
- As chamadas ao gateway passaram de 15 para 16.
- Os e-mails enviados passaram de 0 para 1.

O MTTR observado foi de até aproximadamente seis segundos, pois a recuperação foi validada após esse intervalo.

## Conclusão

A aplicação apresentou degradação controlada durante a lentidão do gateway. O timeout evitou espera excessiva, o circuit breaker reduziu chamadas à dependência instável e nenhum e-mail foi enviado para operações com erro. Após a remoção da falha, o sistema recuperou o processamento normal.