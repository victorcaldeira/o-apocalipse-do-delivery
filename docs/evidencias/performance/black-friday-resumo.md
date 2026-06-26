# Teste de carga Black Friday

## Cenário

O teste utilizou ramp-up, período de carga estável e ramp-down, atingindo o máximo de 50 usuários virtuais simultâneos.

## SLO definido

- Percentil 95 inferior a 2.500 ms.
- Taxa de falhas inferior a 5%.
- Taxa de checks aprovados superior a 95%.

## Resultados

- Requisições executadas: 8.417
- Iterações concluídas: 8.417
- Iterações interrompidas: 0
- Checks aprovados: 100%
- Requisições com falha: 0%
- Tempo médio: 1,61 ms
- Percentil 95: 2,63 ms
- Tempo máximo: 17,86 ms
- Usuários virtuais máximos: 50
- Leituras no PostgreSQL: 1
- Cache misses: 1
- Cache hits: 8.416
- Escritas no cache: 1

## Conclusão

Todos os thresholds foram aprovados. O Redis atendeu praticamente todas as consultas após o primeiro carregamento, limitando o acesso ao PostgreSQL a uma única leitura durante as 8.417 requisições. O sistema permaneceu dentro do SLO estabelecido durante todas as fases do teste.