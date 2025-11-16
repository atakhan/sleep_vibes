.PHONY: help up down restart logs clean build stop ps

# Переменные
COMPOSE = docker-compose
PROJECT_NAME = sleep_vibes
PORT = 8080

# Цвета для вывода
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

help: ## Показать справку по доступным командам
	@echo "$(GREEN)Доступные команды:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

dev:
	make down
	make up

up: ## Запустить приложение через Docker Compose
	@echo "$(GREEN)Запуск приложения...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)Приложение доступно по адресу: http://localhost:$(PORT)$(NC)"

down: ## Остановить и удалить контейнеры
	@echo "$(YELLOW)Остановка контейнеров...$(NC)"
	$(COMPOSE) down

stop: ## Остановить контейнеры без удаления
	@echo "$(YELLOW)Остановка контейнеров...$(NC)"
	$(COMPOSE) stop

restart: ## Перезапустить приложение
	@echo "$(YELLOW)Перезапуск приложения...$(NC)"
	$(COMPOSE) restart

logs: ## Показать логи контейнеров
	$(COMPOSE) logs -f

ps: ## Показать статус контейнеров
	$(COMPOSE) ps

build: ## Пересобрать контейнеры
	@echo "$(GREEN)Сборка контейнеров...$(NC)"
	$(COMPOSE) build

clean: ## Остановить и удалить контейнеры, сети и volumes
	@echo "$(YELLOW)Очистка...$(NC)"
	$(COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)Очистка завершена$(NC)"

dev: ## Запустить в режиме разработки (с логами)
	@echo "$(GREEN)Запуск в режиме разработки...$(NC)"
	$(COMPOSE) up

open: ## Открыть приложение в браузере
	@echo "$(GREEN)Открытие браузера...$(NC)"
	@xdg-open http://localhost:$(PORT) 2>/dev/null || \
	 open http://localhost:$(PORT) 2>/dev/null || \
	 echo "Откройте браузер и перейдите по адресу: http://localhost:$(PORT)"

.DEFAULT_GOAL := help

