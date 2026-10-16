# Despliegue inicial en ARAPP12

Este documento describe el primer despliegue vacío de Control de entrega de
activos. La importación de los datos históricos se realiza en una etapa
posterior, después de validar la aplicación.

## Arquitectura

- `auth`: OAuth2 Proxy expuesto únicamente a través de Caddy.
- `app`: interfaz y API internas; no publica puertos al host.
- `migrate`: aplica las migraciones de Prisma y finaliza.
- PostgreSQL: usa una base y dos roles exclusivos para esta aplicación.
- Keycloak: autentica contra el realm `itac` y entrega los grupos de AD.

URL prevista: `https://activos.ad.itac.com.ar`

## Requisitos previos

1. DNS interno para `activos.ad.itac.com.ar` apuntando a ARAPP12.
2. Cliente confidencial de Keycloak llamado `control-entrega-activos`.
3. Redirect URI exacta:
   `https://activos.ad.itac.com.ar/oauth2/callback`.
4. Grupo de acceso y administración: `/ARR-ITAC-IT`.
5. Base PostgreSQL `control_entrega_activos`.
6. Roles PostgreSQL separados:
   `control_activos_migrator` y `control_activos_app`.
7. Redes Docker externas `db-internal` y `proxy`.

## Archivos sensibles del servidor

Los siguientes archivos deben existir únicamente en ARAPP12, bajo
`/srv/docker/apps/control-entrega-activos/secrets/`:

- `db_app_password`
- `db_migrator_password`
- `keycloak_client_secret`
- `oauth_cookie_secret` (32 bytes aleatorios sin salto de línea)

La carpeta `secrets` debe pertenecer a `root:root` con modo `0700`. Los
archivos se mantienen en modo `0444` porque Docker Compose los monta dentro de
contenedores que se ejecutan sin privilegios como UID `1001`; la carpeta padre
impide que otros usuarios del host puedan acceder a ellos.

El certificado de la CA interna debe quedar en:

`/srv/docker/apps/control-entrega-activos/certs/ad-ITAC-CA.pem`

Ninguno de estos archivos se almacena en Git.

## Despliegue

Desde el checkout en `/opt/docker/apps/control-entrega-activos`:

```bash
sudo docker build -t control-entrega-activos:0.1.0 .
sudo docker compose run --rm migrate
sudo docker compose up -d app auth
sudo docker compose ps
```

Caddy debe enviar el host al contenedor de autenticación:

```caddyfile
activos.ad.itac.com.ar {
    tls internal
    reverse_proxy control-entrega-activos-auth:4180
}
```

Después de validar la configuración, reiniciar Caddy para cargarla.

## Validación

- La aplicación y el proxy permanecen en estado `running`.
- `https://activos.ad.itac.com.ar` redirige a Keycloak.
- Un integrante de `/ARR-ITAC-IT` puede ingresar y administrar datos.
- Un usuario no habilitado recibe acceso denegado.
- La base está vacía excepto por el usuario registrado durante la prueba.
- La API y PostgreSQL no están publicados directamente en la red del host.

## Etapa posterior

Con el despliegue vacío aprobado se ejecutará la importación controlada del ZIP
de Base44, se copiarán las imágenes de planos y se reconciliarán duplicados y
movimientos huérfanos. Antes de importar se realizará un respaldo de la base.
