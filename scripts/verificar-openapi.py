#!/usr/bin/env python3
"""Fails when the REST routes in the controllers and docs-tecnicos/api/domain-openapi.yaml differ.

Run from the domain/ folder: python3 -I scripts/verificar-openapi.py
"""
import glob
import re
import sys

PATH_VAR = re.compile(r"\{[^}]+\}")


def routes_in_code():
    routes = set()
    for path in glob.glob("src/main/java/**/adapters/in/rest/*Controller.java", recursive=True):
        # Endpoint de desarrollo que reinicia la base; no forma parte del contrato público.
        if path.endswith("SeedController.java"):
            continue
        source = open(path, encoding="utf-8").read()
        base = re.search(r'@RequestMapping\("([^"]+)"\)', source).group(1)
        for method, sub in re.findall(r'@(Get|Post|Put|Delete)Mapping(?:\("([^"]*)"\))?', source):
            routes.add((method.upper(), PATH_VAR.sub("{}", base + (sub or ""))))
    return routes


def routes_in_spec():
    routes, current = set(), None
    for line in open("docs-tecnicos/api/domain-openapi.yaml", encoding="utf-8"):
        path = re.match(r"^  (/api\S+):", line)
        if path:
            current = path.group(1)
        method = re.match(r"^    (get|post|put|delete):", line)
        if method and current:
            routes.add((method.group(1).upper(), PATH_VAR.sub("{}", current)))
    return routes


code, spec = routes_in_code(), routes_in_spec()
missing, extra = sorted(code - spec), sorted(spec - code)
for method, path in missing:
    print(f"FALTA en la especificación: {method} {path}")
for method, path in extra:
    print(f"SOBRA en la especificación: {method} {path}")
print(f"Rutas: {len(code)} en el código, {len(spec)} en la especificación")
sys.exit(1 if missing or extra else 0)
