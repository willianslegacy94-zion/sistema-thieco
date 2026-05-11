# Progresso — Sistema Thieco

## Último ponto de parada

Estávamos **testando o campo de produto** no formulário de registro de venda do Mutinga via API.

---

## O que já foi feito

### Docker
- Sistema completo rodando com `docker compose up -d`
- Volume `thieco_postgres_data` com dados persistentes
- `database/init.sql` com seed automático (8.580 vendas históricas 2024/2025/2026)
- Nginx configurado com `client_max_body_size 20m`

### Frontend — RegistroVenda.jsx
- Campo **Serviço** com autocomplete + dropdown (filtra serviços/combos — `controla_estoque = false`)
- Campo **Produto** com autocomplete + dropdown (filtra produtos — `controla_estoque = true`)
- Ambos preenchem preço automaticamente ao selecionar
- Fix aplicado: `parseFloat(preco).toFixed(2)` — `preco_venda` vinha como string da API
- Desconto fixo em R$
- Produto registrado como venda vinculada (upsell) ao submeter

### GitHub
- Repositório próprio: `https://github.com/willianslegacy94-zion/sistema-thieco`
- Branch `main` atualizada com todos os commits

---

## O que estava sendo testado (parou aqui)

Teste do campo produto via API com o usuário Mutinga:

- **Credenciais Mutinga:** `username: mutinga` / `senha: Mutinga@2025!`
- Login funciona, token JWT retornado com sucesso
- Próximo passo: verificar se `catalogo` retorna `controla_estoque` corretamente
- E depois: registrar uma venda com produto vinculado e confirmar no banco

### Comandos prontos para retomar

```bash
# Login
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mutinga","senha":"Mutinga@2025!"}'

# Catálogo completo (verificar campo controla_estoque)
curl -s http://localhost/api/catalogo

# Produtos no banco
docker exec thieco_db psql -U postgres -d sistema_thieco \
  -c "SELECT id, nome, preco_venda, controla_estoque FROM catalogo WHERE controla_estoque = true LIMIT 5;"
```

---

## Credenciais do sistema

| Usuário | Senha | Role |
|---|---|---|
| `thieco` | `Thieco@2025!` | admin |
| `mutinga` | `Mutinga@2025!` | operador |

## Acesso
- **Sistema:** http://localhost
- **Banco (DBeaver):** localhost:5432 / postgres / `Thieco2025!` / DB: `sistema_thieco`
