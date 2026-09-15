# Plataforma de Gestión para Fábrica de Muebles

Este proyecto es una plataforma web desarrollada para facilitar la gestión de inventarios, pedidos y producción en una fábrica de muebles. Está construido con tecnologías modernas como **React**, **Node.js**, **Express** y **Tailwind CSS**.

---

## Tecnologías utilizadas

- 🔹 React.js (frontend)
- 🔹 Tailwind CSS (estilos)
- 🔹 Node.js + Express (backend)
- 🔹 MySQL (base de datos)
- 🔹 Docker y Docker Compose (despliegue)
- 🔹 Git y GitHub (control de versiones)

---

## Funcionalidades principales

- Autenticación de usuarios y gestión de roles.
- Registro y visualización de pedidos.
- Administración de inventario.
- Interfaz responsiva y moderna.
- Estructura modular y escalable.

---

## Instalación y ejecución local

### Requisitos previos

- [Docker](https://www.docker.com/) y Docker Compose (recomendado)
- Node.js y npm (solo para desarrollo sin Docker)
- Git

### Clonar el repositorio

```bash
git clone https://github.com/DerleyLG/Abakosoft.git
cd Abakosoft
```

### Opción A — Con Docker (recomendada)

```bash
# 1. Crear el archivo de variables de entorno
copy .env.example .env        # Windows
# cp .env.example .env        # Linux / macOS

# 2. Editar .env y ajustar al menos:
#    DB_PASSWORD, JWT_SECRET, SAAS_JWT_SECRET, SAAS_REFRESH_JWT_SECRET,
#    SAAS_SEED_ADMIN_PASSWORD, FRONTEND_URLS

# 3. Construir y levantar los contenedores
docker compose up -d --build
```

Los servicios quedan disponibles en:

| Servicio       | URL                   |
| -------------- | --------------------- |
| Frontend (app) | http://localhost:3001 |
| Backend (API)  | http://localhost:3002 |
| MySQL          | localhost:3307        |

> **Primer arranque:** el backend crea automáticamente la base de datos maestra
> (`abakosoft_master`) y los esquemas de tenants. El SuperAdmin se crea en el
> primer arranque a través del flujo de setup en **http://localhost:3001/saas/setup**.

### Opción B — Sin Docker (desarrollo)

```bash
# 1. Crear el .env (ver variables abajo)
copy .env.example .env

# 2. Backend (puerto 3002)
cd backend
npm install
npm run dev

# 3. Frontend (puerto 5173, Vite)
cd ../frontend
npm install
npm run dev
```

> En desarrollo, el frontend corre en `http://localhost:5173` y debe estar
> incluido en `FRONTEND_URLS` del `.env` para que la autenticación funcione.

---

## Variables de entorno

El archivo [docker-compose.yml](docker-compose.yml) y el backend leen las
variables desde un `.env` en la raíz del proyecto. Usa
[.env.example](.env.example) como plantilla.

| Variable                   | Descripción                                | Ejemplo                                       |
| -------------------------- | ------------------------------------------ | --------------------------------------------- |
| `DB_HOST`                  | Host de MySQL                              | `db` (Docker) / `localhost` (local)           |
| `DB_USER`                  | Usuario de MySQL                           | `root`                                        |
| `DB_PASSWORD`              | Contraseña de MySQL                        | `masterkey`                                   |
| `DB_NAME`                  | Base de datos principal                    | `gestion_abako`                               |
| `DB_PORT`                  | Puerto de MySQL                            | `3306`                                        |
| `MASTER_DB_NAME`           | Base de datos maestra (SaaS)               | `abakosoft_master`                            |
| `PORT`                     | Puerto del backend                         | `3002`                                        |
| `JWT_SECRET`               | Secreto JWT de sesión                      | —                                             |
| `SAAS_JWT_SECRET`          | Secreto JWT del panel SaaS                 | —                                             |
| `SAAS_REFRESH_JWT_SECRET`  | Secreto JWT de refresh                     | —                                             |
| `SAAS_SEED_ADMIN_PASSWORD` | Password inicial del SuperAdmin            | —                                             |
| `FRONTEND_URLS`            | URLs permitidas (CORS), separadas por coma | `http://localhost:5173,http://localhost:3001` |
| `SAAS_COOKIE_SAMESITE`     | `lax` \| `strict` \| `none`                | `lax`                                         |
| `SAAS_COOKIE_SECURE`       | `true` solo con HTTPS                      | `false`                                       |
| `SAAS_COOKIE_DOMAIN`       | (Opcional) dominio de la cookie            | —                                             |
| `APP_TZ`                   | (Opcional) zona horaria                    | `America/Bogota`                              |

---

## Estructura del proyecto

```
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   └── database/     # Conexiones y seed de la BD maestra
│   └── database/         # Esquemas SQL (master_schema, tenant_templates)
├── frontend/         # SPA React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── services/
│       └── context/
├── docker-compose.yml
└── .env.example
```
