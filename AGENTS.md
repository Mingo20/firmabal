# AGENTS.md · FirmAbal (versión base)

Guía para agentes de IA y para personas que necesiten modificar este proyecto. Léela completa antes de tocar el código.

## Contexto

- **Organización:** DGTech (República Dominicana). Fundador: Domingo Guerra.
- **Proyecto:** FirmAbal (versión base) · versión actual **1.0.0** · estado **Archivo / legado**.
- **Repositorio:** `Mingo20/firmabal`
- **Aplicación en vivo:** https://mingo20.github.io/firmabal/
- **Hub del ecosistema:** https://mingo20.github.io/dtech/
- **Idioma de la interfaz y de las respuestas:** español dominicano.

## Qué resuelve

Prototipo inicial de captura territorial de afiliaciones.

## Resumen técnico

**Tipo:** PWA

Aplicación local con base de datos del navegador (db.js).

**Stack**

- JavaScript modular (api, audit, db, icons, map, ocr, pdf, ui)
- Service Worker (firmabal-v1.0.0)

**Backend**

- Ninguno

**Datos**

- Base de datos local del navegador

## Reglas que no se pueden romper

- No añadir funciones nuevas aquí: usar firmabal-pwa

## Datos sensibles

Cédulas y firmas.

## Cómo trabajar aquí

1. Lee el README y este archivo. Luego abre el código que vayas a cambiar.
2. Haz el cambio más pequeño que resuelva el problema. No reescribas lo que funciona.
3. Prueba en el navegador antes de dar algo por terminado: abre la aplicación, recorre el flujo afectado y revisa la consola.
4. Si la app tiene Service Worker, **sube el número de la caché** al cambiar archivos, o los usuarios seguirán viendo la versión vieja.
5. Registra cada cambio en `CHANGELOG.md` con la versión, la fecha y una línea clara.
6. Sube la versión según la regla: *mayor* si rompes algo, *menor* si añades una función, *parche* si corriges un error.

## Reglas de seguridad

- **Nunca** escribas contraseñas, tokens, claves de API ni PIN en el código, en los README ni en los mensajes de commit. Este repositorio es público.
- Las claves van como secretos del backend. En el navegador solo puede haber datos públicos.
- Si encuentras una credencial expuesta, avisa al dueño y recomienda rotarla antes de seguir.
- No borres datos de producción sin confirmación explícita del dueño.

## Pendientes conocidos

- Archivar este repositorio cuando se confirme que firmabal-pwa lo reemplaza por completo

## Estilo

- Textos para el usuario en español dominicano, claros y cordiales.
- Horas en formato de 12 horas (9:45 p. m.). Fechas con el mes en letras.
- Diseño limpio, rápido y pensado primero para el celular.

## Contacto

Domingo Guerra · DGTech · WhatsApp 829-646-9885
