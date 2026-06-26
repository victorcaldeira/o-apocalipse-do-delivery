const {
  CircuitBreaker
} = require('../../src/resilience/CircuitBreaker');

describe('CircuitBreaker', () => {
  let agora;
  let circuitBreaker;

  beforeEach(() => {
    agora = 1000;

    circuitBreaker = new CircuitBreaker({
      limiteFalhas: 0.5,
      minimoAmostras: 4,
      tempoAbertoMs: 5000,
      agoraFn: () => agora
    });
  });

  test('deve permanecer fechado quando a taxa de falhas for igual a 50%', () => {
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarSucesso();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarSucesso();

    expect(circuitBreaker.obterEstado()).toBe('FECHADO');
    expect(() => circuitBreaker.verificarPermissao())
      .not
      .toThrow();
  });

  test('deve abrir quando a taxa de falhas ultrapassar 50%', () => {
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarSucesso();

    expect(circuitBreaker.obterEstado()).toBe('ABERTO');

    expect(() => circuitBreaker.verificarPermissao())
      .toThrow('Circuit breaker aberto');
  });

  test('deve mudar para meio aberto após o período de recuperação', () => {
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarSucesso();

    agora += 5000;

    expect(() => circuitBreaker.verificarPermissao())
      .not
      .toThrow();

    expect(circuitBreaker.obterEstado())
      .toBe('MEIO_ABERTO');
  });

  test('deve fechar novamente após sucesso no estado meio aberto', () => {
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarSucesso();

    agora += 5000;

    circuitBreaker.verificarPermissao();
    circuitBreaker.registrarSucesso();

    expect(circuitBreaker.obterEstado()).toBe('FECHADO');

    expect(() => circuitBreaker.verificarPermissao())
      .not
      .toThrow();
  });

  test('deve voltar ao estado aberto após falha no estado meio aberto', () => {
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarFalha();
    circuitBreaker.registrarSucesso();

    agora += 5000;

    circuitBreaker.verificarPermissao();
    circuitBreaker.registrarFalha();

    expect(circuitBreaker.obterEstado()).toBe('ABERTO');

    expect(() => circuitBreaker.verificarPermissao())
      .toThrow('Circuit breaker aberto');
  });
});
