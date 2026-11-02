# Imagen de desarrollo de AuthCore.
#
# No modifica el repositorio authcore (R1): DevTools se inyecta con un init script montado en /opt.
# Gradle recompila en continuo (-t classes) y bootRun sigue arriba; DevTools reinicia el contexto.
FROM gradle:9.7.1-jdk21

COPY docker/authcore-devtools.init.gradle /opt/authcore-devtools.init.gradle

WORKDIR /app

RUN mkdir -p /app/build /app/.gradle && chown -R gradle:gradle /app

USER gradle

CMD ["sh", "-c", "sh gradlew -t classes --console=plain & exec sh gradlew bootRun --init-script /opt/authcore-devtools.init.gradle --console=plain"]
