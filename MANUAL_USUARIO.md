# Manual do Usuário — Sistema Barbearia Thieco Leandro

> Versão: maio/2026 · Acesso: `http://localhost:5173`

---

## Sumário

1. [Acesso ao sistema](#1-acesso-ao-sistema)
2. [Perfis de usuário](#2-perfis-de-usuário)
3. [Dashboard — Visão Geral](#3-dashboard--visão-geral)
4. [Registro de Vendas](#4-registro-de-vendas)
5. [Combos de Serviços](#5-combos-de-serviços)
6. [Controle de Gastos](#6-controle-de-gastos)
7. [Clientes](#7-clientes)
8. [Catálogo e Estoque](#8-catálogo-e-estoque)
9. [Metas](#9-metas)
10. [Gestão de Time (Admin)](#10-gestão-de-time-admin)
11. [Relatórios e Exportação](#11-relatórios-e-exportação)
12. [Perguntas Frequentes](#12-perguntas-frequentes)

---

## 1. Acesso ao sistema

Abra o navegador e acesse o endereço do sistema. A tela de login será exibida.

| Usuário | Login | Papel |
|---|---|---|
| Thieco Leandro | `thieco` | Admin (acesso total, unidade Tamboré) |
| Caixa Mutinga | `mutinga` | Operador (registra vendas da unidade Mutinga) |
| Caixa Tamboré | `tambore` | Operador (registra vendas da unidade Tamboré) |

A senha padrão de cada perfil foi configurada na instalação. Em caso de esquecimento, solicite redefinição ao suporte técnico.

A sessão expira automaticamente após **8 horas**. Ao expirar, o sistema redireciona para o login.

---

## 2. Perfis de usuário

### Admin (Thieco)
- Acessa todos os relatórios e dados de **ambas as unidades**
- Pode filtrar por unidade ou ver consolidado
- Tem acesso exclusivo à aba **Gestão de Time** (feedbacks, PDCA, sugestões, timeline de barbeiros)
- Pode ativar/inativar barbeiros
- Pode registrar vendas, gastos e qualquer operação

### Operador (Caixa)
- Vê apenas dados da **própria unidade**
- Registra vendas, gastos e movimenta combos
- Não acessa relatórios gerenciais nem gestão de time

---

## 3. Dashboard — Visão Geral

O Dashboard é a tela principal após o login. Para o Admin, exibe métricas consolidadas com filtro de período e unidade.

### Filtros (Admin)

- **De / Até** — Digite ou selecione o período. Ao digitar manualmente, o filtro só é aplicado após você terminar de digitar a data completa (o campo não trava mais durante a digitação).
- **Unidade** — "Todas as Unidades", "Tamboré" ou "Mutinga"
- **Atualizar** — Força a recarga dos dados imediatamente

### Métricas exibidas

| Card | O que mostra |
|---|---|
| Faturamento Bruto | Total das vendas no período |
| Ticket Médio | Faturamento ÷ número de atendimentos |
| Melhor dia | Data com maior receita |
| Projeção do mês | Estimativa para o fim do mês com base na média diária |

### Ranking de Barbeiros

Lista os barbeiros ativos ordenados por faturamento no período. Barbeiros inativados não aparecem no ranking.

### DRE Resumido

Exibe a demonstração de resultado: receita bruta, taxas de maquininha (PagBank), comissões pagas, despesas e lucro líquido.

**Taxas PagBank vigentes:**
- Débito: 1,19%
- Crédito à vista: 3,49%
- Pix / Dinheiro / Cortesia: isento

---

## 4. Registro de Vendas

### Como registrar uma venda

1. No menu lateral, acesse **Registro de Venda**
2. Selecione o barbeiro responsável
3. Escolha o serviço no campo "Serviço" (lista do catálogo)
4. Preencha o valor
5. Selecione a forma de pagamento
6. Informe a data
7. Clique em **Registrar**

> O campo **Unidade** é preenchido automaticamente com base na unidade do barbeiro selecionado. Para operadores, reflete sempre a própria unidade.

### Campos opcionais

- **Nome do cliente** — para rastreamento e histórico
- **Tipo de cliente** — agendado, walk-in, retorno, indicação
- **Origem do cliente** — como chegou (Instagram, Google, indicação…)
- **Desconto** — valor em R$ a deduzir do total
- **Observação** — anotações livres
- **Upsell** — marcar se a venda originou de um combo anterior

### Editar ou excluir uma venda

Na listagem de vendas, clique no ícone de lápis para editar ou no ícone de lixeira para excluir. Confirme a ação na janela de confirmação.

---

## 5. Combos de Serviços

Combos são pacotes pré-pagos pelo cliente (ex: 4 cortes). O sistema controla quantas sessões já foram usadas.

### Criar um combo

1. Acesse **Registro de Venda > aba Combos**
2. Preencha o nome do cliente, serviços incluídos, valor e data de vencimento
3. Selecione o barbeiro responsável
4. Clique em **Criar Combo**

### Ativar sessão de combo (usar 1 crédito)

1. Na aba **Buscar Combo**, pesquise pelo nome do cliente
2. Selecione o combo ativo correspondente
3. Escolha a forma de pagamento desta sessão
4. Clique em **Usar Sessão**

O sistema registra a venda e desconta o uso do combo automaticamente.

### Listar combos ativos

Na tela de combos, os combos próximos do vencimento aparecem em destaque. Combos expirados ficam marcados em vermelho.

---

## 6. Controle de Gastos

Acesse **Gastos** no menu lateral.

### Registrar um gasto

1. Clique em **Novo Gasto**
2. Selecione a **categoria** (aluguel, produto, manutenção, salário, outros…)
3. Preencha descrição, valor e data
4. Informe a unidade (para operadores é automático)
5. Clique em **Salvar**

Os gastos aparecem no DRE e no relatório de fluxo de caixa.

---

## 7. Clientes

Acesse **Clientes** no menu lateral.

- **Buscar** — pesquise por nome
- **Novo cliente** — cadastre nome, contato, barbeiro preferido e unidade
- **Editar** — atualize dados ou adicione observações

O sistema registra automaticamente a data da primeira visita e conta o total de atendimentos quando o nome do cliente é informado no registro de venda.

---

## 8. Catálogo e Estoque

Acesse **Catálogo** no menu lateral.

### Itens com estoque controlado

Produtos que possuem controle de estoque (pomadas, bebidas, snacks…) exibem a quantidade atual. Quando a quantidade fica abaixo do mínimo configurado, o item fica destacado.

### Ajustar estoque

1. Localize o produto na lista
2. Clique no campo de quantidade
3. Informe a entrada (+) ou saída (-)
4. Confirme

### Adicionar novo item ao catálogo

Preencha nome, categoria, preço de venda, preço de custo (opcional) e se controla estoque. Serviços não controlam estoque.

---

## 9. Metas

Acesse **Metas** no menu lateral.

### Metas individuais (por barbeiro)

Configure três faixas — Bronze, Prata e Ouro — com valor de faturamento e bonificação correspondente para cada período (mês/ano).

### Metas por unidade

Configure a meta global da unidade para o mês. O sistema calcula o progresso em tempo real com base nas vendas registradas.

---

## 10. Gestão de Time (Admin)

Exclusivo para o perfil Admin. Acesse **Gestão de Time** no menu.

### Aba Equipe

Exibe todos os barbeiros, ativos e inativos.

- Clique no ícone de toggle para **inativar** ou **reativar** um barbeiro
- Uma confirmação será solicitada antes da ação
- Barbeiros inativos ficam opacos na lista e com badge "Inativo" em vermelho
- Use o botão **"Ver inativos"** para exibir ou ocultar os inativos

> Inativar um barbeiro remove-o dos seletores de venda e do ranking, mas **preserva todo o histórico de atendimentos** para relatórios.

### Aba Feedbacks

Registre feedbacks individuais sobre cada barbeiro. Dois tipos:
- **Elogio** — reconhecimento positivo
- **Melhoria** — ponto a desenvolver

Cada feedback tem título, descrição, categoria e data.

### Aba Planos de Ação (PDCA)

Crie planos de desenvolvimento no ciclo Plan-Do-Check-Act:
- **Planejar** — o que será feito
- **Executar** — como está sendo feito
- **Checar** — o que foi observado
- **Agir** — ajustes e próximos passos

Status disponíveis: Pendente, Em Andamento, Concluído, Cancelado.

### Aba Sugestões

Registre sugestões de melhoria para qualquer unidade. Cada sugestão tem prioridade (baixa/média/alta) e status de acompanhamento (aberta → em análise → aprovada → implementada / rejeitada).

### Aba Timeline

Selecione um barbeiro e veja a linha do tempo completa de feedbacks, planos de ação e marcos importantes.

---

## 11. Relatórios e Exportação

Relatórios disponíveis no Dashboard Admin:

| Relatório | Localização |
|---|---|
| Fluxo de caixa | Dashboard > selecionar período |
| DRE (resultado) | Dashboard > seção DRE |
| Comissões por barbeiro | Dashboard > Ranking |
| Inteligência de vendas | Dashboard > abas de análise |
| Resumo do operador | Visão do operador logado |

Todos os relatórios respeitam os filtros de período e unidade selecionados.

---

## 12. Perguntas Frequentes

**O faturamento do Tamboré está zerado, por quê?**
Verifique se o operador ou admin está selecionando um barbeiro vinculado à unidade Tamboré ao registrar vendas. O sistema usa a unidade do barbeiro selecionado para classificar a venda.

**Digitei uma data no filtro e a página travou.**
Isso foi corrigido. O filtro de data agora espera você terminar de digitar antes de recarregar. Se ainda ocorrer, pressione Tab ou clique fora do campo para confirmar.

**O barbeiro não aparece no seletor de vendas.**
O barbeiro pode estar inativo. Acesse Gestão de Time > Equipe e verifique o status. Reative se necessário.

**Como resetar a senha de um usuário?**
Acesse o banco de dados via `docker exec -it thieco_db psql -U postgres sistema_thieco` e execute:
```sql
UPDATE usuarios SET senha_hash = crypt('NovaSenha123!', gen_salt('bf')) WHERE username = 'nome_usuario';
```
Solicite ao suporte técnico se não tiver acesso.

**O combo de um cliente não aparece na busca.**
Verifique se o combo está ativo e não vencido. Combos vencidos não aparecem na busca padrão.

**Posso ter dois barbeiros com o mesmo nome?**
Não. O campo nome em profissionais tem restrição de unicidade. Caso necessário, diferencie com sobrenome ou apelido.
