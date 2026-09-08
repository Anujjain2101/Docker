# Docker 3-Tier Practice Project

A deliberately small 3-tier app:
- Frontend: Nginx serving HTML/JS
- Backend: Node.js + Express REST API
- Database: PostgreSQL

## Architecture

Browser/curl -> Frontend (Nginx :8080) -> Backend (Node :3000) -> PostgreSQL (:5432)

The frontend proxies `/api/*` to the backend.

## Option 1: Docker Compose (recommended)

From this directory:

```bash
docker compose up --build -d
docker compose ps
```

Test:

```bash
curl http://localhost:8080
curl http://localhost:8080/api/health
curl http://localhost:8080/api/ratings-summary
```

Submit a rating (example):

```bash
# POST a rating to the backend via the frontend proxy
curl -X POST http://localhost:8080/api/ratings \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Anuj","last_name":"A","rating":5}'
```

Get ratings summary:

```bash
curl http://localhost:8080/api/ratings-summary
```

Open http://localhost:8080 in a browser.

Stop:

```bash
docker compose down
```

Remove containers AND database volume:

```bash
docker compose down -v
```

## Option 2: Build/run containers manually

Create a Docker network:

```bash
docker network create three-tier-net
```

Start PostgreSQL:

```bash
docker run -d --name demo-db --network three-tier-net ^
  -e POSTGRES_USER=demo ^
  -e POSTGRES_PASSWORD=demo123 ^
  -e POSTGRES_DB=demo ^
  -v demo-db-data:/var/lib/postgresql/data ^
  postgres:16-alpine
```

Linux/macOS:

```bash
docker run -d --name demo-db --network three-tier-net   -e POSTGRES_USER=demo   -e POSTGRES_PASSWORD=demo123   -e POSTGRES_DB=demo   -v demo-db-data:/var/lib/postgresql/data   postgres:16-alpine
```

Build backend:

```bash
docker build -t docker-3tier-backend ./backend
```

Run backend:

```bash
docker run -d --name demo-backend --network three-tier-net ^
  -e DB_HOST=demo-db ^
  -e DB_PORT=5432 ^
  -e DB_USER=demo ^
  -e DB_PASSWORD=demo123 ^
  -e DB_NAME=demo ^
  -p 3000:3000 ^
  docker-3tier-backend
```

Build frontend:

```bash
docker build -t docker-3tier-frontend ./frontend
```

Run frontend:

```bash
docker run -d --name demo-frontend --network three-tier-net -p 8080:80 docker-3tier-frontend
```

Test:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/users
```

Useful commands:

```bash
docker ps
docker logs demo-backend
docker logs demo-frontend
docker exec -it demo-db psql -U demo -d demo
docker network inspect three-tier-net
docker volume ls
```

Cleanup:

```bash
docker rm -f demo-frontend demo-backend demo-db
docker network rm three-tier-net
docker volume rm demo-db-data
```

## What to practice

1. Build each image separately.
2. Run each container separately.
3. Understand why containers communicate using container/service names instead of `localhost`.
4. Inspect the network.
5. Inspect the database volume.
6. Stop/remove the DB container and recreate it; verify the data survives because of the volume.
7. Run `docker compose up --build` and compare it with the manual approach.
