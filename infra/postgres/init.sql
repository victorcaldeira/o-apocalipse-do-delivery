CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  cliente_email VARCHAR(255) NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pedidos (
  id,
  cliente_email,
  valor,
  status
)
VALUES (
  1001,
  'cliente@entregasja.com',
  150.00,
  'PROCESSADO'
)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('pedidos', 'id'),
  GREATEST(
    COALESCE((SELECT MAX(id) FROM pedidos), 1),
    1
  )
);