# 🛠️ Plataforma de Gestión para Fábrica de Muebles

Este proyecto es una plataforma web desarrollada para facilitar la gestión de inventarios, pedidos y producción en una fábrica de muebles. Está construido con tecnologías modernas como **React**, **Node.js**, **Express** y **Tailwind CSS**.

---

## 🚀 Tecnologías utilizadas

- 🔹 React.js (frontend)
- 🔹 Tailwind CSS (estilos)
- 🔹 Node.js + Express (backend)
- 🔹 MySql (base de datos - en desarrollo)
- 🔹 Git y GitHub (control de versiones)

---

## 📋 Funcionalidades principales

- Autenticación de usuarios y gestión de roles.
- Registro y visualización de pedidos.
- Administración de inventario.
- Interfaz responsiva y moderna.
- Estructura modular y escalable.

---

## ⚙️ Instalación y ejecución local

### 🔧 Requisitos previos

- Node.js y npm instalados
- Mysql local o en la nube (cuando se conecte)
- Git

### 🖥️ Clonar el repositorio

```bash
git clone https://github.com/DerleyLG/plataforma-gestion-fabrica.git
cd plataforma-gestion-fabrica
copy .env.example .env
docker compose up -d --build
```

## Variables de entorno para Docker

El archivo [docker-compose.yml](docker-compose.yml) usa variables leídas desde un `.env` en la raíz del proyecto.

Usa [ .env.example ](.env.example) como plantilla y ajusta como mínimo:

- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `SAAS_JWT_SECRET`
- `SAAS_REFRESH_JWT_SECRET`
- `SAAS_SEED_ADMIN_PASSWORD`
- `FRONTEND_URLS`
