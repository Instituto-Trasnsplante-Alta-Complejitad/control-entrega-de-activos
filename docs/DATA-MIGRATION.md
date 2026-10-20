# Migración de datos desde Base44

La importación inicial consume la exportación completa de Base44 y conserva sus
IDs para mantener todas las relaciones. El proceso se ejecuta en dos etapas:
simulación y aplicación. La aplicación se niega a insertar si alguna tabla de
negocio ya contiene registros.

## Preparar la exportación

Descomprimir el ZIP definitivo en:

`/srv/docker/apps/control-entrega-activos/import`

El directorio debe contener directamente `manifest.json`,
`files-manifest.json` y la carpeta `data`. El contenedor se ejecuta como UID y
GID `1001`, por lo que necesita permiso de lectura sobre esos archivos.

## Excepciones históricas conocidas

- Cinco movimientos de stock apuntan a tres componentes eliminados en Base44.
  El importador crea tres componentes técnicos con estado `historico` para
  conservar los movimientos y sus IDs originales.
- Un componente no tiene tipo. Se normaliza a `sin_especificar`.
- Doce planos conservan URLs externas de Base44 porque el ZIP no incluye los
  archivos. Las imágenes locales se cargan y reconcilian después de importar.
- Existen valores repetidos de activo o serie en equipos. Se preservan para que
  el equipo de IT pueda reconciliarlos posteriormente sin pérdida de datos.

## Simulación

```bash
sudo docker compose --profile tools run --rm import
```

La salida debe terminar con `Simulación correcta` y no modifica PostgreSQL.

## Respaldo

Antes de aplicar la importación se debe generar un `pg_dump` de la base, incluso
si se espera que esté vacía. El respaldo se conserva fuera del checkout Git.

## Aplicación

```bash
sudo docker compose --profile tools run --rm import \
  ./node_modules/.bin/tsx scripts/import-base44-export.mjs \
  --source /import --apply
```

La operación completa se ejecuta en una transacción. Ante un error no queda una
importación parcial. Al finalizar, el script vuelve a contar cada tabla y exige
que coincida con la fuente más los tres componentes históricos reconstruidos.
