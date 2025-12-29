## Acceso y Verificación de la Base de Datos (PostgreSQL + Docker)

Para validar el correcto funcionamiento de la base de datos y las queries, se utiliza el acceso directo al contenedor de PostgreSQL.

### Acceso a la base de datos
```bash
docker exec -it hotel-yacanto-postgres psql -U postgres -d hotel_yacanto
```
## Para reiniciar docker
```bash
docker compose down -v --rmi all
docker compose up --build
```

### Comandos utiles en pSQL
```bash
\dt                 -- Listar tablas
\d empleados        -- Ver estructura de una tabla
\dv                 -- Listar vistas
\q                  -- Salir
```

## Para ver logs de docker 

en tiempo real 

docker-compose logs -f backend

todos los servicios 

docker-compose logs


## para ver si postgres esta conectado 

docker ps