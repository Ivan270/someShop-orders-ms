# Orders Microservice

```
docker compose up -d
```

## Development pasos
1. Clonar el proyecto
2. Crear un archivo `.env` basado en el archivo `.env.example`
3. LLevantar la base de datos con `docker-compose up -d`
4. Levantar el servidor de Nats
```
docker run -d --name nats-main -p 4222:4222 -p 8222:8222 nats
```
5. Levantar el proyecto con `npm run start:dev`