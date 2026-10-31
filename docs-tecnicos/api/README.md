# Documentación de la API (RNF-14)

| Archivo | Servicio |
|---|---|
| `domain-openapi.yaml` | Domain service (HU-8 a HU-12), puerto 8085 |
| `authcore-openapi.yaml` | AuthCore (HU-1 a HU-7), puerto 8081 |

Los dos archivos están escritos a mano a partir de los controladores y los DTO, para no agregar
dependencias al código entregado por el profesor. Cuando cambie un controlador, actualice el YAML
y verifique:

```bash
# Desde domain/
python3 -I scripts/verificar-openapi.py          # las rutas del código y del YAML coinciden
cd docs-tecnicos/api && npx @redocly/cli@1.34.5 lint domain-openapi.yaml authcore-openapi.yaml
```

Para verlos como documentación navegable, sin instalar nada en el proyecto:

```bash
cd docs-tecnicos/api && npx @redocly/cli@1.34.5 preview-docs domain-openapi.yaml
```

`authcore-openapi.yaml` describe el comportamiento **actual** de AuthCore, incluidas sus
diferencias con el backlog (decisión D2): la contraseña mínima es de 6 caracteres, no se valida el
formato del usuario, y las rutas protegidas responden 403 en lugar de 401 cuando falta el token.
