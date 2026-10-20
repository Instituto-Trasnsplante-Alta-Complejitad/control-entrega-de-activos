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

URL prevista: `https://apps.ad.itac.com.ar/activos`

OAuth2 Proxy conserva el issuer y la URL de inicio de sesión públicos, pero
utiliza los endpoints internos `http://keycloak:8080` para canjear códigos y
validar firmas. Esto evita que un contenedor tenga que volver a ingresar a
ARAPP12 mediante la IP externa del servidor.

Los usuarios federados desde Active Directory no presentan el atributo OIDC
`email_verified=true`. OAuth2 Proxy acepta esos correos porque la identidad ya
fue validada por Keycloak contra el AD corporativo; además se mantienen las
restricciones por dominio y grupo de AD.

## Requisitos previos

1. El host existente `apps.ad.itac.com.ar` debe apuntar a ARAPP12.
2. Cliente confidencial de Keycloak llamado `control-entrega-activos`.
3. Redirect URI exacta:
   `https://apps.ad.itac.com.ar/activos/oauth2/callback`.
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

Caddy debe enviar solamente la ruta `/activos` al contenedor de autenticación.
La ruta de OAuth se conserva completa y el prefijo se elimina para el resto de
la aplicación:

```caddyfile
apps.ad.itac.com.ar {
    tls internal

    handle /auth* {
        reverse_proxy keycloak:8080
    }

    redir /activos /activos/ 308

    handle /activos/oauth2/* {
        reverse_proxy control-entrega-activos-auth:4180
    }

    handle_path /activos/* {
        reverse_proxy control-entrega-activos-auth:4180 {
            header_up X-Forwarded-Uri {orig_uri}
        }
    }

    handle {
        reverse_proxy portal-itac:3000
    }
}
```

Después de validar la configuración, reiniciar Caddy para cargarla.

## Validación

- La aplicación y el proxy permanecen en estado `running`.
- `https://apps.ad.itac.com.ar/activos` redirige a Keycloak.
- Un integrante de `/ARR-ITAC-IT` puede ingresar y administrar datos.
- Un usuario no habilitado recibe acceso denegado.
- La base está vacía excepto por el usuario registrado durante la prueba.
- La API y PostgreSQL no están publicados directamente en la red del host.

## Etapa posterior

Con el despliegue vacío aprobado se ejecutará la importación controlada del ZIP
de Base44, se copiarán las imágenes de planos y se reconciliarán duplicados y
movimientos huérfanos. Antes de importar se realizará un respaldo de la base.
