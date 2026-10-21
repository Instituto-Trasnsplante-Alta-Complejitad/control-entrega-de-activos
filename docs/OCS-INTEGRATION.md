# Integración OCS, dashboard y alertas

## Objetivo

La aplicación consulta directamente la API de OCS Inventory y actualiza los
datos técnicos del inventario. No depende del archivo Excel que se utilizaba
para la exportación manual.

La sincronización se ejecuta automáticamente cada 24 horas y también puede
iniciarse desde el dashboard por un administrador.

## Datos que OCS puede actualizar

- identificador OCS y hostname/activo;
- usuario detectado;
- marca, modelo y número de serie;
- procesador, RAM y almacenamiento;
- sistema operativo;
- fecha del último reporte.

OCS **no modifica** el estado administrativo, la persona asignada, el sector,
la sede, el plano, los comentarios ni los periféricos. Cada cambio técnico se
registra en `equipment_change_log` con origen `ocs`.

## Asociación segura

El orden de asociación es:

1. identificador OCS;
2. hostname/número de activo único;
3. número de serie válido y único.

Las coincidencias ambiguas se omiten y se registran como advertencias. Por
defecto `OCS_CREATE_MISSING=false`: un equipo que existe solamente en OCS se
informa como descubierto, pero no se crea automáticamente.

## Frecuencia y alertas

- sincronización: cada 24 horas;
- alerta OCS: más de 24 horas sin reporte;
- alerta OCS crítica: más de 7 días sin reporte;
- reporte específico: más de 30 días sin reporte;
- hardware: RAM menor a 8 GB, disco HDD o sistema operativo antiguo;
- calidad de datos: series faltantes y activos/series duplicados;
- operación: stock en mínimo y entregas pendientes antiguas.

Los valores se pueden ajustar mediante las variables de entorno documentadas
en `.env.example`.

La página **Reportes técnicos** permite descargar dos Excel: equipos con más de
30 días sin reportar y candidatos a renovación. Como el inventario no posee una
fecha de compra confiable, el segundo listado estima prioridad mediante RAM,
tipo de disco, sistema operativo y familia/generación del procesador, mostrando
siempre los motivos utilizados.

## Ejecución manual en ARAPP12

Desde `/opt/docker/apps/control-entrega-activos`:

```bash
sudo docker compose --profile tools run --rm ocs-sync
```

También se puede usar el botón **Sincronizar OCS** del dashboard. Solamente un
administrador puede iniciarla. Un bloqueo global en PostgreSQL evita que se
ejecuten dos sincronizaciones al mismo tiempo, incluso desde contenedores
distintos.

## Diagnóstico

```bash
sudo docker logs --since 30m control-entrega-activos

sudo docker compose --profile tools run --rm ocs-sync
```

El resultado de cada corrida queda en `ocs_sync_log`, incluyendo cantidades
procesadas, actualizadas, omitidas y errores de muestra.

## Red y seguridad

El contenedor de la aplicación se conecta a una red Docker de salida exclusiva
para consultar `inventario.ad.itac.com.ar`. La API OCS actual usa HTTP sin
credenciales. Si en el futuro se habilita autenticación Basic, debe preferirse
HTTPS y guardar usuario/contraseña como Docker secrets; nunca deben incluirse
en Git ni enviarse al navegador.
