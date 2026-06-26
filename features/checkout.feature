# language: pt

Funcionalidade: Processamento seguro do checkout
  Como cliente do serviço de delivery
  Quero que o checkout trate diferentes respostas do pagamento
  Para que o pedido tenha um resultado consistente

  Contexto:
    Dado que existe um pedido válido

  Cenário: Pagamento aprovado
    Dado que o gateway aprova o pagamento
    Quando o checkout for processado
    Então o pedido deve ser salvo com o status "PROCESSADO"
    E o checkout deve retornar o pedido processado
    E o e-mail de confirmação deve ser enviado

  Cenário: Cartão recusado
    Dado que o gateway recusa o pagamento
    Quando o checkout for processado
    Então o pedido deve ser salvo com o status "FALHOU"
    E o checkout deve retornar uma falha controlada
    E o e-mail de confirmação não deve ser enviado

  Cenário: Timeout no gateway de pagamento
    Dado que o gateway excede o limite de 2 segundos
    Quando o checkout for processado
    Então o pedido deve ser salvo com o status "ERRO_GATEWAY"
    E o checkout deve retornar uma falha controlada
    E o e-mail de confirmação não deve ser enviado

  Cenário: Falha de infraestrutura no gateway
    Dado que o gateway apresenta uma falha de infraestrutura
    Quando o checkout for processado
    Então o pedido deve ser salvo com o status "ERRO_GATEWAY"
    E o checkout deve retornar uma falha controlada
    E o e-mail de confirmação não deve ser enviado
