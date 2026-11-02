# Imagen de desarrollo del servicio de dominio.
#
# Solo aporta el toolchain: al ejecutar, compose monta el proyecto en /app. Nada se compila en la
# imagen. `inotifywait` recompila al cambiar src/ o pom.xml y Spring Boot DevTools reinicia el
# contexto al detectar las clases nuevas.
FROM maven:3.9-eclipse-temurin-17

RUN apt-get update \
 && apt-get install -y --no-install-recommends inotify-tools \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

CMD ["sh", "-c", "mvn -q -DskipTests compile; inotifywait -q -m -r -e modify,create,delete,move src pom.xml | while read -r _; do mvn -q compile; done & exec mvn spring-boot:run"]
