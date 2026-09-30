.PHONY: start start-bg stop stop-wipe logs seed test-backend test-frontend prod tunnel

start:
	docker compose up --build

start-bg:
	docker compose up --build -d

stop:
	docker compose down

stop-wipe:
	docker compose down -v

logs:
	docker compose logs -f

seed:
	docker compose run --rm seed

backend-tests:
	docker compose run --rm backend pytest -q

frontend-build:
	docker compose run --rm frontend npm run build

prod:
	docker compose --profile prod up --build frontend-prod

tunnel:
	docker compose --profile tunnel up ngrok
