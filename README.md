# Control de entrega de activos | ITAC

Aplicación interna para gestionar inventario, entregas de equipos, impresoras,
componentes, planos y sincronización con OCS Inventory.

La rama `migration/self-hosted` reemplaza los servicios de Base44 por una
arquitectura administrada por ITAC:

- React + Vite para la interfaz.
- Node.js + Express para la API.
- PostgreSQL + Prisma para persistencia.
- Keycloak + Active Directory mediante OAuth2 Proxy.
- Docker Compose para ejecución en ARAPP12.

## Estado de la migración

La aplicación y los datos históricos se encuentran migrados a la infraestructura
administrada por ITAC en ARAPP12. Los archivos reales de exportación no deben
copiarse al repositorio.

El dashboard incluye alertas operativas y sincronización directa con OCS cada
24 horas. La creación automática de equipos descubiertos en OCS permanece
deshabilitada: los registros nuevos se informan en el log para evitar altas o
duplicaciones accidentales.

## Desarrollo

Requiere Node.js 24 y PostgreSQL 17.

```bash
npm ci
npm run db:generate
npm run dev:server
npm run dev
```

Durante desarrollo puede establecerse `DEV_AUTH_BYPASS=true`, pero el servidor
lo ignora cuando `NODE_ENV=production`.

## Validaciones

```bash
npm run db:validate
npm run lint
npm run build
```

## Producción

La imagen se construye con:

```bash
docker build -t control-entrega-activos:0.1.0 .
```

`compose.yml` espera las redes externas `db-internal` y `proxy`, además de los
secretos y el certificado interno ubicados bajo
`/srv/docker/apps/control-entrega-activos/`.

El único servicio conectado a `proxy` es OAuth2 Proxy. La API y PostgreSQL no
quedan publicados. Los administradores se determinan por el grupo de Keycloak
`/ARR-ITAC-IT`; pertenecer al dominio de correo no concede privilegios.

## Datos sensibles

No subir al repositorio:

- exportaciones JSON o ZIP;
- contraseñas y secretos OIDC;
- imágenes de planos reales;
- archivos `.env`;
- copias de la base de datos.

## Documentación operativa

- [Integración con OCS y alertas](docs/OCS-INTEGRATION.md)
