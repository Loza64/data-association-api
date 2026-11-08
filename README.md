# Data Association API

Backend que relaciona **Users, Orders, Products y Categories** mediante referencias de Mongoose (`ref`) y `populate`. Permite guardar, consultar y gestionar registros relacionados, y recuperar los datos asociados en una sola respuesta (una orden con su usuario, sus productos y la categoría de cada producto). Conserva el registro (`signup`) y el inicio de sesión (`login`) con JWT. Construido con Node.js, Express 5, TypeScript y MongoDB (Mongoose 9), con arquitectura hexagonal.

## Tabla de contenido

- [Stack](#stack)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Modelo de datos y relaciones](#modelo-de-datos-y-relaciones)
- [Cómo se recuperan los datos relacionados](#cómo-se-recuperan-los-datos-relacionados)
- [Reglas de integridad](#reglas-de-integridad)
- [Autenticación](#autenticación)
- [Endpoints](#endpoints)
- [Validaciones](#validaciones)
- [Formato de respuestas y errores](#formato-de-respuestas-y-errores)
- [Arquitectura](#arquitectura)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Pruebas](#pruebas)
- [Base de datos con Docker](#base-de-datos-con-docker)
- [Docker](#docker)

## Stack

| Área | Tecnología |
|---|---|
| Runtime / lenguaje | Node.js 22, TypeScript 5 |
| HTTP | Express 5, Helmet, CORS, Morgan, express-rate-limit |
| Base de datos | MongoDB con Mongoose 9 (`ref`, `populate`, virtual populate) y mongoose-paginate-v2 |
| Hash de contraseñas | scrypt (módulo `crypto` de Node) |
| Tokens | JSON Web Tokens (jsonwebtoken, HS256) |
| Validación | class-validator, class-transformer |
| Documentación | swagger-jsdoc, swagger-ui-express |
| Pruebas | Jest, ts-jest, Supertest |
| Gestor de paquetes | pnpm |

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
```

Genera un secreto para firmar los tokens y colócalo en `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
pnpm dev
```

- API: `http://localhost:4400/api`
- Swagger: `http://localhost:4400/api-docs` (botón **Authorize** para pegar el token)
- OpenAPI en JSON: `http://localhost:4400/api-docs.json`

Producción: `pnpm build` y `pnpm start`. Al arrancar se valida la configuración, se conecta a MongoDB y se esperan los índices de las cuatro colecciones antes de aceptar peticiones.

## Variables de entorno

Se leen desde `.env` (ver `.env.example`). Las variables vacías usan su valor por defecto.

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `4400` | Puerto HTTP |
| `NODE_ENV` | `development` | En `development` los errores 500 incluyen el mensaje real |
| `ORIGIN` | vacío | Orígenes permitidos por CORS, separados por coma. Vacío permite cualquiera |
| `MONGO_URI` | `mongodb://localhost:27017/association_db` | Cadena de conexión (ver [Base de datos con Docker](#base-de-datos-con-docker)) |
| `JWT_SECRET` | sin valor | **Obligatorio**, mínimo 32 caracteres |
| `JWT_EXPIRES_IN_SECONDS` | `3600` | Vigencia del token |
| `PASSWORD_MIN_LENGTH` | `6` | Longitud mínima de contraseña (5 a 128) |
| `PWNED_PASSWORDS_CHECK` | `true` | Rechaza contraseñas filtradas (Have I Been Pwned, k-anonimato). Si el servicio no responde, se acepta |
| `SCRYPT_LOG_N` | `16` | Costo del hash: N = 2^valor (16 a 20) |
| `LOGIN_MAX_ATTEMPTS` | `5` | Fallos permitidos antes de bloquear la cuenta |
| `LOGIN_LOCKOUT_SECONDS` | `900` | Duración del bloqueo y ventana de conteo |
| `AUTH_RATE_LIMIT_MAX` | `30` | Peticiones por IP cada 15 min a `signup` y `login` |
| `TRUST_PROXY` | vacío | Saltos de proxy a confiar si la API está detrás de uno |

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Servidor en desarrollo con recarga (`ts-node-dev`) |
| `pnpm build` | Compila con `tsc` y resuelve alias con `tsc-alias` |
| `pnpm start` | Ejecuta `build/index.js` |
| `pnpm test` | Ejecuta las pruebas |
| `pnpm test:watch` | Pruebas en modo observación |

## Modelo de datos y relaciones

```
Category 1 ──────< Product >────── N (items) OrderItem >────── 1 Order >────── 1 User
 (category)        (items.product)                 (items)          (user)
```

- **Category → Product (1:N):** cada producto referencia una categoría (`Product.category`, obligatorio, indexado). La categoría no guarda la lista de productos: se calcula con un *virtual populate*.
- **User → Order (1:N):** cada orden referencia a su usuario (`Order.user`). El usuario no guarda sus órdenes.
- **Order ↔ Product (N:M):** una orden tiene hasta 50 ítems (subdocumentos) y cada ítem referencia un producto (`items.product`). Es la tabla intermedia de la relación muchos a muchos, con datos propios: cantidad, precio y subtotal.

La referencia vive en el lado "muchos" y el lado "uno" se obtiene con `populate`. Así los documentos no crecen sin límite y no hay dos copias de la relación que mantener sincronizadas.

### `users`

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | string | 2 a 80 caracteres |
| `username` | string | Único, 3 a 30 caracteres (letras, números, `.`, `-`, `_`), en minúsculas |
| `password` | string | Hash scrypt. `select: false`, nunca se devuelve |
| `failedLoginAttempts`, `lastAttemptAt`, `lockedUntil` | internos | Bloqueo por intentos fallidos. No se exponen |

### `categories`

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | string | 2 a 60 caracteres. **Único sin distinguir mayúsculas** (índice único con collation `es`, strength 2) |
| `description` | string | Hasta 500 caracteres |
| `productsCount` | number | Virtual: número de productos de la categoría (`populate` con `count: true`) |

### `products`

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | string | 2 a 120 caracteres |
| `description` | string | Hasta 1000 caracteres |
| `price` | number | De 0.01 a 1 000 000, máximo 2 decimales |
| `category` | ObjectId → `Category` | Obligatorio, indexado. Debe existir al crear o mover el producto |
| `isActive` | boolean | Por defecto `true`. Un producto inactivo no se puede ordenar |

### `orders`

| Campo | Tipo | Reglas |
|---|---|---|
| `user` | ObjectId → `User` | Siempre el usuario autenticado; no se puede enviar en el cuerpo |
| `items[]` | subdocumentos | 1 a 50 ítems, sin productos repetidos |
| `items[].product` | ObjectId → `Product` | Debe existir y estar activo al crear la orden |
| `items[].productName`, `items[].unitPrice` | string, number | **Copia** del nombre y precio del producto al comprar |
| `items[].quantity` | integer | 1 a 1000 |
| `items[].subtotal` | number | `unitPrice × quantity`, calculado en el servidor |
| `total` | number | Suma de subtotales, calculada en el servidor |
| `status` | string | `pending` (por defecto), `completed` o `cancelled` |
| `notes` | string | Hasta 500 caracteres |

Los importes se calculan en centavos enteros para evitar errores de coma flotante (`19.99 × 3 = 59.97`).

**Índices:** `users.username` (único); `categories.name` (único, collation `es`); `products.category`, `products.name`; `orders {user, createdAt}`, `orders {user, status, createdAt}` y `orders {items.product}` (multikey, usado para saber si un producto está en alguna orden).

## Cómo se recuperan los datos relacionados

| Consulta | Técnica de Mongoose |
|---|---|
| Producto con su categoría | `populate({ path: 'category', select: 'name' })` |
| Orden con usuario, productos y categoría de cada producto | `populate` de `user` y de `items.product`, con `populate` anidado de `category` |
| Categoría con su número de productos | *Virtual populate* con `count: true` (`productsCount`), sin guardar el contador |
| Productos de una categoría / órdenes de un usuario | Consulta por la referencia (`{ category: id }`, `{ user: id }`) con paginación |

Todas las consultas usan `lean()` y `select` para traer solo los campos necesarios: de `user` solo `name` y `username` (nunca el hash), de `items.product` solo `name price isActive category`. Las listas están paginadas (`page`, `pageSize` hasta 100) con `mongoose-paginate-v2`.

Ejemplo de respuesta de `POST /api/orders` (también de `GET /api/orders/:id`):

```json
{
  "data": {
    "id": "6aefaa14ff0c97623db9b146",
    "user": { "id": "6aefaa14ff0c97623db9b143", "name": "Ana Lopez", "username": "ana" },
    "items": [
      {
        "product": {
          "id": "6aefaa14ff0c97623db9b145",
          "name": "Cafe molido 500g",
          "price": 12.5,
          "isActive": true,
          "category": { "id": "6aefaa14ff0c97623db9b144", "name": "Bebidas" }
        },
        "productName": "Cafe molido 500g",
        "unitPrice": 12.5,
        "quantity": 2,
        "subtotal": 25
      }
    ],
    "total": 25,
    "status": "pending",
    "notes": "Sin azucar",
    "createdAt": "2026-11-07T22:45:40.724Z",
    "updatedAt": "2026-11-07T22:45:40.724Z"
  }
}
```

`product` es la versión **actual** del producto (puede haber cambiado de precio o nombre); `productName` y `unitPrice` son lo que se compró. Si algún día el producto no existiera, `product` sería `null` y la orden seguiría siendo legible gracias a la copia.

## Reglas de integridad

MongoDB no tiene claves foráneas, así que la API aplica las reglas relacionales:

| Operación | Regla |
|---|---|
| Crear o mover un producto | La categoría debe existir (`400` si no) |
| Crear una orden | Todos los productos deben existir (`400`) y estar activos (`409`); sin repetidos (`400`) |
| Eliminar una categoría | `409` si tiene productos (relación restrictiva) |
| Eliminar un producto | `409` si aparece en alguna orden; se recomienda desactivarlo con `isActive=false` |
| Eliminar un usuario | Solo el propio, y `409` si tiene órdenes |
| Modificar una orden | Solo si está `pending` (`409` si no); `pending` pasa a `completed` o `cancelled` |
| Eliminar una orden | Solo la propia y no completada (`409` si está completada) |
| Ver o modificar órdenes | Solo las propias. Una orden ajena responde `404` (no revela que existe) |

El precio de compra se conserva en la orden, así que cambiar el precio de un producto no altera el historial.

## Autenticación

Se conservan `signup` y `login`; el resto de endpoints requiere `Authorization: Bearer <token>`.

- **Contraseñas:** longitud mínima de 15 y máxima de 128, sin reglas de composición; se rechazan las comunes, predecibles, las que contienen tus datos y las filtradas. Hash scrypt con sal aleatoria.
- **Login:** usuario inexistente, contraseña incorrecta y cuenta bloqueada responden lo mismo (`401 Credenciales inválidas`) y tardan lo mismo. Tras `LOGIN_MAX_ATTEMPTS` fallos la cuenta se bloquea `LOGIN_LOCKOUT_SECONDS`; el conteo es atómico en la base de datos. Hay además límite por IP (`429`).
- **Token:** JWT HS256 con el id del usuario. En cada petición se verifica la firma, el algoritmo y la vigencia, y que el usuario siga existiendo (si se elimina, su token deja de valer).
- Las respuestas llevan `Cache-Control: no-store`.

Se eliminaron `logout`, cambio de contraseña y `/auth/me`, que no forman parte de esta tarea.

## Endpoints

Todos devuelven JSON. Salvo `signup` y `login`, requieren token. La documentación completa (esquemas y códigos) está en `/api-docs`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/signup` | Registra un usuario |
| POST | `/api/auth/login` | Inicia sesión y devuelve el token |
| GET | `/api/users` | Lista usuarios (`page`, `pageSize`, `search`) |
| GET | `/api/users/:id` | Obtiene un usuario |
| PATCH | `/api/users/:id` | Actualiza tu `name` o `username` |
| DELETE | `/api/users/:id` | Elimina tu cuenta (`409` si tiene órdenes) |
| GET | `/api/users/:id/orders` | Tus órdenes pobladas (`page`, `pageSize`, `status`); `403` si no es tu id |
| POST | `/api/categories` | Crea una categoría |
| GET | `/api/categories` | Lista categorías con `productsCount` (`page`, `pageSize`, `search`) |
| GET | `/api/categories/:id` | Obtiene una categoría con `productsCount` |
| GET | `/api/categories/:id/products` | Productos de la categoría, con la categoría poblada |
| PATCH | `/api/categories/:id` | Actualiza nombre o descripción |
| DELETE | `/api/categories/:id` | Elimina una categoría sin productos |
| POST | `/api/products` | Crea un producto en una categoría existente (`category: { id }`) |
| GET | `/api/products` | Lista productos con su categoría (`page`, `pageSize`, `search`, `categoryId`) |
| GET | `/api/products/:id` | Obtiene un producto con su categoría |
| PATCH | `/api/products/:id` | Actualiza un producto, incluida su categoría (`category: { id }`) |
| DELETE | `/api/products/:id` | Elimina un producto que no esté en órdenes |
| POST | `/api/orders` | Crea una orden del usuario autenticado |
| GET | `/api/orders` | Lista tus órdenes pobladas (`page`, `pageSize`, `status`) |
| GET | `/api/orders/:id` | Obtiene una de tus órdenes |
| PATCH | `/api/orders/:id` | Cambia `status` (`completed` o `cancelled`) o `notes` de una orden pendiente |
| DELETE | `/api/orders/:id` | Elimina una de tus órdenes no completadas |

Cuerpo de `POST /api/products`:

```json
{
  "name": "Cafe molido 500g",
  "description": "Tostado medio",
  "price": 12.5,
  "category": { "id": "6aefaa14ff0c97623db9b144" }
}
```

Cuerpo de `POST /api/orders`:

```json
{
  "items": [
    { "product": { "id": "6aefaa14ff0c97623db9b145" }, "quantity": 2 }
  ],
  "notes": "Sin azucar"
}
```

## Validaciones

- Los cuerpos y consultas se validan con `class-validator` con lista blanca: un campo desconocido (por ejemplo `userId`, `total` o `price` dentro de un ítem) responde `400`. El usuario, los precios y el total nunca se aceptan del cliente.
- Los ids en la ruta deben ser ObjectId válidos (`400`).
- Precios con más de 2 decimales, cantidades no enteras o fuera de rango, órdenes vacías o con más de 50 ítems y `status` inválidos responden `400`.
- `PATCH` sin ningún campo responde `400`.

## Formato de respuestas y errores

Un recurso: `{ "data": { ... } }`. Una lista:

```json
{
  "data": [ ... ],
  "pagination": { "page": 1, "pageSize": 10, "pageCount": 3, "total": 25 }
}
```

Los errores devuelven `{ "status": 409, "message": "..." }`. Códigos usados: `400` validación, `401` sin token o credenciales inválidas, `403` recurso de otro usuario, `404` no encontrado, `409` conflicto de integridad (duplicado, relación restrictiva, estado), `429` límite de peticiones, `500` error inesperado.

## Arquitectura

Hexagonal: el dominio no conoce Express ni Mongoose; la infraestructura implementa los puertos.

```
src/
├── composition-root.ts          # Ensambla repositorios, casos de uso y controladores
├── interfaces/http/routes.ts    # Monta los routers bajo /api
├── modules/
│   ├── auth/                    # signup, login, JWT, scrypt, política de contraseñas
│   ├── user/                    # usuarios
│   ├── category/                # categorías
│   ├── product/                 # productos
│   └── order/                   # órdenes y sus ítems
│       ├── domain/              # entidades y puerto del repositorio
│       ├── application/         # DTOs y casos de uso
│       └── infrastructure/
│           ├── http/            # controlador y rutas (con la documentación Swagger)
│           └── persistence/     # esquema Mongoose, mapper y repositorio
├── shared/                      # configuración, errores, paginación, validación, base de datos
└── testing/                     # repositorios en memoria y escenarios de prueba
```

Los casos de uso dependen de puertos (`OrderRepository`, `ProductRepository`...), nunca de Mongoose. Los repositorios de Mongoose devuelven objetos de dominio ya poblados.

## Limitaciones conocidas

- **Sin transacciones.** MongoDB en modo standalone (como el contenedor de este proyecto) no las admite. Las comprobaciones de integridad (por ejemplo, "la categoría no tiene productos" y luego borrar) son de tipo comprobar-y-actuar: una petición concurrente que cree un producto justo entre la comprobación y el borrado podría dejar un producto apuntando a una categoría eliminada. En ese caso `populate` devuelve `category: null` y nada se rompe, pero la inconsistencia existe. Con un replica set, estas operaciones deberían ir dentro de una transacción.
- **Sin roles.** Cualquier usuario autenticado puede crear, modificar y eliminar categorías y productos. Si el catálogo debe ser administrado por un rol concreto, hay que añadir roles al usuario y un middleware de autorización.
- **Stock y pagos** no forman parte del alcance: crear una orden no descuenta existencias.
- **Contraseñas filtradas:** si el servicio de Have I Been Pwned no responde, la contraseña se acepta.
- **HTTPS:** la API debe ir detrás de HTTPS en producción; los tokens viajan en la cabecera `Authorization`.
- **Tokens:** no se pueden revocar de a uno; vencen según `JWT_EXPIRES_IN_SECONDS`.

## Pruebas

```bash
pnpm test
```

- **Unitarias:** política de contraseñas, hash scrypt, JWT, verificador de credenciales (bloqueo), DTOs de autenticación y de usuario.
- **API con repositorios en memoria:** los mismos escenarios (`src/testing/api-scenarios.ts`) cubren registro, login, CRUD de las cuatro entidades, populate, totales, snapshot de precios, propiedad de las órdenes y todas las reglas de integridad.
- **API contra MongoDB real (opcional):** el mismo conjunto de escenarios contra un servidor levantado de verdad. Se omite si no se define `API_TEST_URL`:

```bash
pnpm dev                                              # con MongoDB disponible y un .env válido
API_TEST_URL=http://localhost:4400 pnpm test api.mongo
```

Estas pruebas crean usuarios y datos nuevos en la base que use el servidor; úsalas con una base de pruebas. Desactiva el límite por IP del servidor para esta ejecución (`AUTH_RATE_LIMIT_MAX=10000`) y, si lo corres con `SCRYPT_LOG_N=16` (mínimo permitido), espera unos 20 segundos.

## Base de datos con Docker

MongoDB se levanta con el compose del repositorio [Loza64/docker-containers](https://github.com/Loza64/docker-containers/blob/main/database/mongo/docker-compose.yaml) (carpeta `database/mongo`). Esta API no incluye su propio servicio de Mongo: se conecta a ese contenedor.

Lo que define ese compose:

| Elemento | Valor |
|---|---|
| Imagen | `mongo:latest` |
| Contenedor | `some-mongo` |
| Puerto | `27017` publicado en el host |
| Usuario root | `MONGO_INITDB_ROOT_USERNAME` (por defecto `mongo`) |
| Contraseña root | `MONGO_INITDB_ROOT_PASSWORD` (por defecto `change_me`) |
| Volúmenes | `db` (`/data/db`) y `config` (`/data/configdb`) |
| Red | `network` (bridge) |
| Healthcheck | `mongosh` con `ping` cada 10 s |

Levantarlo, definiendo una contraseña propia en lugar de la de ejemplo:

```bash
cd database/mongo
MONGO_INITDB_ROOT_PASSWORD=<tu_password> docker compose up -d
```

(También puedes poner las variables en un `.env` dentro de esa carpeta.) Las credenciales solo se aplican la primera vez, cuando se crea el volumen `db`.

**Nombre de la red.** Compose antepone el nombre del proyecto, que por defecto es el de la carpeta. Al ejecutarlo desde `database/mongo`, la red `network` se crea como `mongo_network`, que es la que usa el `docker-compose.yaml` de esta API. Si lo levantas desde otra carpeta, el nombre cambia; confírmalo con `docker network ls`.

**Cadena de conexión.** El usuario root se crea en la base `admin`, por eso la URI lleva `authSource=admin`:

| Dónde corre la API | `MONGO_URI` |
|---|---|
| En tu máquina (`pnpm dev`) | `mongodb://mongo:<tu_password>@localhost:27017/association_db?authSource=admin` |
| En Docker (misma red) | `mongodb://mongo:<tu_password>@some-mongo:27017/association_db?authSource=admin` |

Dentro de un contenedor `localhost` apunta al propio contenedor, por eso en Docker se usa el nombre `some-mongo`. Si la contraseña tiene `@`, `:`, `/`, `?` o `#`, debe codificarse en formato URL.

El compose de Mongo publica `27017` en todas las interfaces. Si no necesitas acceso desde fuera de tu máquina, ese archivo trae comentada la alternativa `127.0.0.1:27017:27017` para limitarlo a localhost.

## Docker

Con MongoDB ya levantado (sección anterior):

```bash
cp .env.example .env
docker compose up --build
```

- `docker-compose.yaml` define solo el servicio `api` y lo une a la red externa `mongo_network`. Esa red debe existir antes, es decir, el contenedor de Mongo debe haberse levantado primero.
- La configuración sale del `.env`: `MONGO_URI` (con el host `some-mongo` dentro de Docker) y `JWT_SECRET`, que es obligatorio.
- El `Dockerfile` es multi-etapa: instala con `--frozen-lockfile`, ejecuta `pnpm test` y `pnpm build`, y la imagen final corre como usuario sin privilegios.
- El puerto publicado es el definido en `PORT` (4400 si no se define).
- Si Mongo no está disponible al arrancar, la API termina con error y `restart: unless-stopped` la reinicia hasta que pueda conectarse.
