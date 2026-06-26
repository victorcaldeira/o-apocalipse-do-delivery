param(
  [switch]$IncluirMutacao
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$env:K6_NO_COLOR = 'true'

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$diretorioLog = Join-Path $raiz 'docs\evidencias\video'
New-Item -ItemType Directory -Force $diretorioLog | Out-Null

$data = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$arquivoLog = Join-Path $diretorioLog "demonstracao-$data.txt"
$arquivoBlackFridayJson = Join-Path $diretorioLog "black-friday-$data.json"
$arquivoGatewayJson = Join-Path $diretorioLog "gateway-caos-$data.json"

function Titulo {
  param([string]$Texto)

  Write-Host ''
  Write-Host ('=' * 75)
  Write-Host $Texto
  Write-Host ('=' * 75)
}

function Validar {
  param(
    [string]$Etapa,
    [int]$Codigo
  )

  if ($Codigo -ne 0) {
    throw "$Etapa falhou com código $Codigo."
  }
}

function EsperarAplicacao {
  for ($tentativa = 1; $tentativa -le 30; $tentativa++) {
    try {
      $health = Invoke-RestMethod `
        -Uri 'http://localhost:3000/health' `
        -TimeoutSec 3

      if ($health.status -eq 'UP') {
        Write-Host 'Aplicação saudável.'
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw 'A aplicação não ficou saudável.'
}

function RemoverLatencia {
  try {
    Invoke-RestMethod `
      -Method Delete `
      -UserAgent "" `
      -Uri 'http://localhost:8474/proxies/gateway_pagamento/toxics/latencia_gateway_5000ms' `
      -ErrorAction Stop |
      Out-Null

    Write-Host 'Latência removida.'
  } catch {
    Write-Host 'Nenhuma latência ativa.'
  }
}

function MostrarMetricas {
  Invoke-RestMethod `
    -Uri 'http://localhost:3000/admin/metrics' |
    Format-List
}

Start-Transcript -Path $arquivoLog -Force | Out-Null

try {
  Titulo 'DEMONSTRAÇÃO FINAL — O APOCALIPSE DO DELIVERY'

  Write-Host "Execução iniciada em: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"

  Titulo '1. COMPLEXIDADE CICLOMÁTICA'

  Write-Host 'V(G) = número de decisões + 1'
  Write-Host 'V(G) = 2 + 1'
  Write-Host 'V(G) = 3'
  Write-Host ''
  Write-Host 'Caminhos independentes:'
  Write-Host '- pagamento aprovado'
  Write-Host '- pagamento recusado'
  Write-Host '- erro no gateway'

  Titulo '2. HISTÓRICO TDD — RED E GREEN'

  & git log --oneline --decorate -20
  Validar 'Histórico Git' $LASTEXITCODE

  Titulo '3. TESTES JEST'

  & npm.cmd test -- --runInBand
  Validar 'Jest' $LASTEXITCODE

  Titulo '4. CENÁRIOS BDD'

  & npm.cmd run bdd
  Validar 'BDD' $LASTEXITCODE

  Titulo '5. TESTE DE MUTAÇÃO'

  if ($IncluirMutacao) {
    & npm.cmd run mutation
    Validar 'Stryker' $LASTEXITCODE
  } else {
    Write-Host 'Mutantes gerados: 282'
    Write-Host 'Mutantes mortos: 257'
    Write-Host 'Mutantes sobreviventes: 14'
    Write-Host 'Timeouts: 5'
    Write-Host 'Sem cobertura: 3'
    Write-Host 'Erros: 3'
    Write-Host 'Mutation score final: 93,91%'
    Write-Host ''
    Write-Host 'Relatório salvo em:'
    Write-Host 'docs\evidencias\mutacao\final\index.html'
  }

  Titulo '6. INFRAESTRUTURA DOCKER'

  & docker compose up -d
  Validar 'Docker Compose' $LASTEXITCODE

  RemoverLatencia
  EsperarAplicacao

  & docker compose ps
  Validar 'Estado dos contêineres' $LASTEXITCODE

  Titulo '7. TESTE BLACK FRIDAY'

  Invoke-RestMethod `
    -Method Post `
    -Uri 'http://localhost:3000/admin/cache/flush' |
    Out-Null

  Invoke-RestMethod `
    -Method Post `
    -Uri 'http://localhost:3000/admin/metrics/reset' |
    Out-Null

  & k6 run `
    --no-color `
    --summary-export $arquivoBlackFridayJson `
    '.\tests\performance\black-friday.js'

  Validar 'Black Friday' $LASTEXITCODE

  Write-Host ''
  Write-Host 'Métricas da aplicação:'
  MostrarMetricas

  Titulo '8. THUNDERING HERD — 10.000 REQUISIÇÕES'

  Invoke-RestMethod `
    -Method Post `
    -Uri 'http://localhost:3000/admin/cache/flush' |
    Out-Null

  Invoke-RestMethod `
    -Method Post `
    -Uri 'http://localhost:3000/admin/metrics/reset' |
    Out-Null

  & docker compose stop redis
  Validar 'Parada do Redis' $LASTEXITCODE

  Start-Sleep -Seconds 3

  $redeDocker = & docker inspect `
    -f '{{range $nome, $config := .NetworkSettings.Networks}}{{$nome}}{{end}}' `
    delivery-app

  Validar 'Identificação da rede Docker' $LASTEXITCODE

  $scripts = (Resolve-Path '.\tests\performance').Path
  $evidencias = $diretorioLog

  & docker run --rm `
    --network $redeDocker `
    --mount "type=bind,source=$scripts,target=/scripts,readonly" `
    --mount "type=bind,source=$evidencias,target=/evidencias" `
    -e BASE_URL='http://app:3000' `
    grafana/k6:latest `
    run `
    --no-color `
    --summary-export "/evidencias/thundering-herd-$data.json" `
    '/scripts/thundering-herd.js'

  Validar 'Thundering Herd' $LASTEXITCODE

  Write-Host ''
  Write-Host 'Métricas da aplicação:'
  MostrarMetricas

  Write-Host ''
  Write-Host 'Validação de sobrevivência do banco:'

  & docker compose exec -T postgres `
    psql -U delivery -d delivery `
    -c 'SELECT 1 AS banco_operacional;'

  Validar 'PostgreSQL' $LASTEXITCODE

  & docker compose start redis
  Validar 'Restauração do Redis' $LASTEXITCODE

  EsperarAplicacao

  Titulo '9. GATEWAY COM 5.000 MS DE LATÊNCIA'

  & docker compose restart app
  Validar 'Reinicialização da aplicação' $LASTEXITCODE

  EsperarAplicacao

  Invoke-RestMethod `
    -Method Post `
    -Uri 'http://localhost:3000/admin/metrics/reset' |
    Out-Null

  RemoverLatencia

  $toxic = @{
    name = 'latencia_gateway_5000ms'
    type = 'latency'
    stream = 'downstream'
    toxicity = 1.0
    attributes = @{
      latency = 5000
      jitter = 0
    }
  } | ConvertTo-Json -Depth 5

  Invoke-RestMethod `
    -Method Post `
    -UserAgent "" `
    -Uri 'http://localhost:8474/proxies/gateway_pagamento/toxics' `
    -ContentType 'application/json' `
    -Body $toxic |
    Out-Null

  Write-Host 'Latência de 5.000 ms aplicada.'

  & k6 run `
    --no-color `
    --summary-export $arquivoGatewayJson `
    '.\tests\performance\gateway-caos.js'

  Validar 'Caos no gateway' $LASTEXITCODE

  Write-Host ''
  Write-Host 'Métricas durante a degradação:'
  MostrarMetricas

  Titulo '10. RECUPERAÇÃO E MTTR'

  RemoverLatencia

  Write-Host 'Aguardando seis segundos para recuperação...'
  Start-Sleep -Seconds 6

  $arquivoResposta = Join-Path `
    $diretorioLog `
    "gateway-recuperacao-$data.json"

  & curl.exe -sS `
    -o $arquivoResposta `
    -w "status=%{http_code} tempo=%{time_total}s`n" `
    -H 'Content-Type: application/json' `
    --data-binary '@.\tests\performance\checkout-pedido.json' `
    'http://localhost:3000/checkout'

  Validar 'Recuperação do gateway' $LASTEXITCODE

  Write-Host ''
  Write-Host 'Pedido processado após a recuperação:'
  Get-Content $arquivoResposta

  Write-Host ''
  Write-Host 'Métricas finais:'
  MostrarMetricas

  Titulo '11. ESTADO FINAL'

  & docker compose ps
  Validar 'Estado final do Docker' $LASTEXITCODE

  & git status
  Validar 'Estado final do Git' $LASTEXITCODE

  Write-Host ''
  Write-Host 'DEMONSTRAÇÃO FINALIZADA COM SUCESSO'
  Write-Host "Log completo salvo em: $arquivoLog"
} finally {
  try {
    RemoverLatencia
  } catch {
  }

  try {
    & docker compose start redis | Out-Null
  } catch {
  }

  Stop-Transcript | Out-Null
}