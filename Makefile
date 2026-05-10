# ─────────────────────────────────────────────────────────
#  Barbearia Thieco Leandro — Comandos de Deploy
#  Uso: make <comando>
# ─────────────────────────────────────────────────────────

.PHONY: help setup up down restart logs build clean ps shell-db

## Exibe esta ajuda
help:
	@echo ""
	@echo "  Barbearia Thieco Leandro — Sistema de Caixa"
	@echo ""
	@echo "  Comandos disponíveis:"
	@echo "    make setup     Copia .env.example para .env (primeira vez)"
	@echo "    make up        Sobe todos os serviços em background"
	@echo "    make down      Para e remove os containers"
	@echo "    make restart   Reinicia todos os serviços"
	@echo "    make build     Rebuilda as imagens do zero"
	@echo "    make logs      Mostra logs em tempo real"
	@echo "    make ps        Lista status dos containers"
	@echo "    make shell-db  Abre psql no banco de dados"
	@echo "    make clean     Remove containers, volumes e imagens"
	@echo ""

## Primeira configuração — copia .env.example
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Arquivo .env criado. Edite as senhas antes de continuar!"; \
	else \
		echo "  .env já existe — não foi sobrescrito."; \
	fi

## Sobe todos os serviços
up:
	docker compose up -d
	@echo ""
	@echo "  ✓ Sistema iniciado!"
	@echo "  → Acesse: http://localhost:$$(grep APP_PORT .env | cut -d= -f2)"
	@echo ""

## Para os serviços
down:
	docker compose down

## Reinicia
restart:
	docker compose restart

## Rebuild completo (sem cache)
build:
	docker compose build --no-cache
	docker compose up -d

## Logs em tempo real
logs:
	docker compose logs -f --tail=100

## Status dos containers
ps:
	docker compose ps

## Shell no banco (psql)
shell-db:
	docker compose exec postgres psql -U $$(grep DB_USER .env | cut -d= -f2) -d $$(grep DB_NAME .env | cut -d= -f2)

## Remove TUDO (incluindo volume do banco — CUIDADO!)
clean:
	@echo "ATENÇÃO: isso vai apagar o banco de dados!"
	@read -p "Confirma? [s/N] " c; [ "$$c" = "s" ] || exit 1
	docker compose down -v --rmi local
