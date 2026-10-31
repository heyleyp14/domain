# Despliegue en AWS (capa gratuita)

Guía para que el equipo publique el sistema en **una sola máquina virtual (EC2) con Docker**. Los pasos
marcados con 🔶 solo se pueden comprobar en AWS. Todo lo demás se ensayó en local con la misma
configuración de producción (ver «Evidencia del ensayo» al final).

> **Antes de empezar:** el agente de desarrollo no tiene acceso a AWS ni lo usó. Las cuentas, las claves
> y los costos son decisión y responsabilidad del equipo.

## 1. Qué se va a desplegar

```
Internet ──► puerto 80 ──► frontend (nginx)
                              ├── /api/auth/** ──► authcore:8081 ──► authcore-db (MySQL)
                              └── /api/**      ──► domain:8085   ──► domain-db (PostgreSQL)
            (red interna de Docker: ningún otro puerto queda expuesto)
```

Se usan dos archivos de compose:
- `docker-compose.yml`: el de siempre;
- `docker-compose.prod.yml`: lo ajusta para producción. Publica solo el puerto 80, reinicia los servicios
  si caen o si se reinicia la máquina, limita la memoria y rota los logs.

## 2. Tamaño de la máquina

Consumo medido con `docker-compose.prod.yml`, después de ejecutar las 50 pruebas de humo:

| Contenedor | Memoria usada | Límite |
|---|---|---|
| domain (Java) | 254 MB | 416 MB |
| authcore (Java) | 213 MB | 384 MB |
| authcore-db (MySQL) | 197 MB | 320 MB |
| domain-db (PostgreSQL) | 32 MB | 192 MB |
| frontend (nginx) | 13 MB | 64 MB |
| **Total** | **≈ 710 MB** | 1.376 MB |

Sin estos límites, los mismos servicios usaban unos 1.650 MB. Una máquina con **1 GB de RAM alcanza
solo con 2 GB de swap** (paso 5); con 2 GB de RAM sobra.

🔶 AWS cambió su capa gratuita en 2025. Antes de crear la máquina, revise en la consola qué tipos de
instancia aparecen como **«Free tier eligible»** en su cuenta (suelen ser `t3.micro` o `t2.micro`, con 1 GB)
y cuánto crédito o tiempo gratuito le queda.

## 3. Crear la instancia 🔶

1. **EC2 → Launch instance.**
2. **Imagen:** Ubuntu Server 24.04 LTS (64 bits, x86).
3. **Tipo:** uno marcado como «Free tier eligible».
4. **Key pair:** cree uno y guarde el archivo `.pem` fuera del repositorio. **Nunca lo suba a GitHub.**
5. **Almacenamiento:** 20 GB gp3. Las imágenes de Docker ocupan unos 3 GB; la capa gratuita suele cubrir hasta 30 GB.
6. **Security group**, con estas reglas de entrada:

   | Puerto | Origen | Para qué |
   |---|---|---|
   | 22 (SSH) | **Solo su IP** («My IP») | Administrar |
   | 80 (HTTP) | **Solo su IP**, al principio | Probar antes de abrirlo (paso 9) |

   No abra 3306, 5432, 8081 ni 8085: esos servicios no deben ser accesibles desde internet.

## 4. Conectarse e instalar Docker 🔶

```bash
chmod 400 ferreteria.pem
ssh -i ferreteria.pem ubuntu@<IP-PÚBLICA>

# Docker y el plugin de compose desde el repositorio oficial de Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit        # salga y vuelva a entrar para usar docker sin sudo
docker compose version                        # debe ser 2.24 o mayor (docker-compose.prod.yml usa !reset)
sudo apt-get install -y git jq                # jq lo usan los scripts de prueba
```

## 5. Swap de 2 GB (obligatorio con 1 GB de RAM) 🔶

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h                                       # la fila Swap debe mostrar 2,0Gi
```

## 6. Descargar el código

Los dos repositorios van **uno al lado del otro**, con estos nombres exactos de carpeta. El compose
construye AuthCore desde `../authcore`, con el Dockerfile `../domain/docker/authcore.Dockerfile`.

```bash
mkdir -p ~/ferreteria && cd ~/ferreteria
git clone https://github.com/josuerangel2005/authcore.git
git clone https://github.com/josuerangel2005/domain.git
cd domain
```

## 7. Configurar los secretos

```bash
./scripts/generar-env.sh          # crea .env con secretos aleatorios NUEVOS (no copie el .env de su equipo)
./scripts/verificar-secreto.sh    # el secreto de AuthCore y el del domain deben corresponder
nano .env                         # complete NEGOCIO_NOMBRE, NEGOCIO_NIT, NEGOCIO_DIRECCION, NEGOCIO_TELEFONO (D4)
chmod 600 .env
```

El `.env` del servidor no sale del servidor: no lo copie, no lo suba ni lo pegue en un chat.

## 8. Levantar el sistema

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps   # los 5 servicios «running» o «healthy»
```

La primera compilación tarda varios minutos en una máquina pequeña. Durante el arranque de Java, el
navegador puede recibir **502**; espere un minuto.

## 9. Cambiar la clave del administrador (OBLIGATORIO antes de abrir el puerto 80)

AuthCore crea el usuario `admin` con una clave fija, escrita en su código y pública (decisión D2). **Mientras
no la cambie, cualquiera puede administrar el sistema.** El cambio se hace sin tocar el código de AuthCore:

```bash
./scripts/cambiar-clave-admin.sh          # pide la clave nueva dos veces: mínimo 12 caracteres, con letras y números
```

- El script reemplaza el hash BCrypt de `admin` en la base de datos y actualiza `ADMIN_PASSWORD` en el `.env`.
- AuthCore no vuelve a crear la clave por defecto al reiniciarse: solo crea `admin` si no existe.
- Guarde la clave nueva en un gestor de contraseñas del equipo.

Después, compruebe todo desde el servidor:

```bash
AUTHCORE=http://localhost DOMAIN=http://localhost ./scripts/humo.sh      # debe terminar con código 0
```

🔶 Cuando la prueba pase, edite el security group y cambie el origen del **puerto 80** a `0.0.0.0/0`.
El sistema queda disponible en `http://<IP-PÚBLICA>/`.

## 10. Respaldos (RNF-12)

```bash
crontab -e
# respaldo diario a las 23:30
30 23 * * * cd /home/ubuntu/ferreteria/domain && ./scripts/respaldo.sh >> respaldos/cron.log 2>&1
```

Una vez por semana, copie el respaldo más reciente **fuera del servidor**, desde su equipo:

```bash
scp -i ferreteria.pem -r ubuntu@<IP-PÚBLICA>:ferreteria/domain/respaldos/<carpeta-más-reciente> ./respaldos-servidor/
```

Cómo restaurar y cómo probar la restauración: `docs-tecnicos/plan-respaldo.md`.

## 11. Actualizar a una versión nueva

```bash
cd ~/ferreteria/authcore && git pull
cd ~/ferreteria/domain && git pull
./scripts/respaldo.sh                                                  # siempre, antes de actualizar
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
AUTHCORE=http://localhost DOMAIN=http://localhost ./scripts/humo.sh
```

## 12. Costos y seguridad 🔶

- **Alerta de costos:** Billing → Budgets → cree un presupuesto de **1 USD** con aviso por correo. Revise
  que la instancia, el disco y la IP pública sigan dentro de la capa gratuita.
- **Detener:** si no la va a usar por días, detenga la instancia (**Stop**, no Terminate). Los datos del
  disco se conservan.
- **HTTP sin cifrar:** sin un dominio, el sistema funciona por `http://`. El token y las contraseñas viajan
  sin cifrar, así que es aceptable para la demostración del curso, **no para la ferretería real**. Para
  producción real hacen falta un dominio y HTTPS (por ejemplo, Caddy o Certbot con Let's Encrypt delante del
  frontend). Eso queda como mejora.
- Las demás brechas de AuthCore siguen abiertas: contraseñas de 6 caracteres, sin validar el formato del
  usuario y 403 en lugar de 401. Ver D2 en `tareas/pendientes-del-equipo.md` y `./scripts/verificar-authcore.sh`.

## 13. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| 502 Bad Gateway | Java todavía está arrancando, o el servicio cayó | Esperar un minuto; `docker compose … logs --tail 50 domain authcore` |
| Un contenedor se reinicia una y otra vez | Le falta memoria | `docker inspect -f '{{.State.OOMKilled}}' <contenedor>`; confirmar que el swap está activo |
| Todas las peticiones dan 401 | `JWT_SECRET` y `JWT_SECRET_BASE64` no corresponden | `./scripts/verificar-secreto.sh` |
| `!reset` da error al levantar | Docker Compose anterior a 2.24 | Instalar Docker desde el repositorio oficial (paso 4) |
| `unable to prepare context … authcore` | Las carpetas no están una al lado de la otra, o no se llaman `authcore` y `domain` | Revisar el paso 6 |
| No carga desde el navegador | El security group no permite el puerto 80 desde su IP | Revisar el paso 3 |

## Evidencia del ensayo local (30/10/2026)

Se levantó `docker-compose.yml` + `docker-compose.prod.yml` en un proyecto de Docker aparte (`pi-prod`), con
bases nuevas, en el equipo de desarrollo:

| Comprobación | Resultado |
|---|---|
| Puertos publicados | Solo el 80 (frontend); `docker port` vacío en los otros 4 |
| `humo.sh` a través del proxy (`http://localhost`) | 50 pasos OK, código 0 |
| Memoria después de las pruebas | ≈ 710 MB en total; ningún contenedor terminado por falta de memoria |
| El domain se cae (`kill 1` dentro del contenedor) | Se reinicia solo y vuelve a responder |
| `cambiar-clave-admin.sh` | La clave por defecto deja de servir y la nueva entra con rol ADMIN; rechaza claves débiles, usuarios inexistentes y nombres con caracteres no permitidos |
| Reiniciar AuthCore después del cambio | La clave por defecto sigue rechazada (401) |

Lo marcado con 🔶 queda por verificar en AWS: tipos de instancia y costos, security group, instalación de
Docker en Ubuntu, el swap, y el rendimiento con 1 vCPU.
