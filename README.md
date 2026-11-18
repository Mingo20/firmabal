<div align="center">

<img src="https://raw.githubusercontent.com/Mingo20/dtech/main/assets/brand/dg-logo-512.png" width="84" alt="DGTech" />

# FirmAbal (versión base)

**Primera versión de FirmAbal con auditoría, mapa, OCR y exportación PDF. Sustituida por firmabal-pwa.**

![Versión](https://img.shields.io/badge/versión-1.0.0-FF6A13?style=flat-square) ![Estado](https://img.shields.io/badge/estado-Archivo_%2F_legado-8B949E?style=flat-square) ![Tipo](https://img.shields.io/badge/tipo-PWA-0B2545?style=flat-square) ![DGTech](https://img.shields.io/badge/by-DGTech-FF6A13?style=flat-square)

[**Abrir la aplicación**](https://mingo20.github.io/firmabal/) · [Hub DGTech](https://mingo20.github.io/dtech/) · [Guía para agentes](AGENTS.md) · [Cambios](CHANGELOG.md)

<img src="https://raw.githubusercontent.com/Mingo20/dtech/main/assets/shots/firmabal.jpg" alt="FirmAbal (versión base)" width="720" />

</div>

> **Repositorio de archivo.** Se conserva por historia. No se añaden funciones aquí. Consulta el proyecto vigente en el [hub de DGTech](https://mingo20.github.io/dtech/).

## El problema

Prototipo inicial de captura territorial de afiliaciones.

## Qué hace

- Captura de cédula y firma
- Auditoría de cambios (audit.js)
- Mapa de registros (map.js)
- Exportación a PDF (pdf.js)

## Cómo está construido

**Tipo:** PWA

Aplicación local con base de datos del navegador (db.js).

**Tecnologías**

- JavaScript modular (api, audit, db, icons, map, ocr, pdf, ui)
- Service Worker (firmabal-v1.0.0)

**Backend**

- Ninguno

**Datos**

- Base de datos local del navegador

## Datos sensibles

Cédulas y firmas.

## Reglas del proyecto

- No añadir funciones nuevas aquí: usar firmabal-pwa

## Pendientes conocidos

- Archivar este repositorio cuando se confirme que firmabal-pwa lo reemplaza por completo

## Estructura del repositorio

Consulta [AGENTS.md](AGENTS.md) para el mapa de archivos y las instrucciones de trabajo.

## Parte de DGTech

Este proyecto forma parte del ecosistema **DGTech**, un estudio de software dominicano que construye aplicaciones instalables para resolver problemas reales. Todas las aplicaciones están en [https://mingo20.github.io/dtech/](https://mingo20.github.io/dtech/).

---

<sub>© 2026 DGTech · Domingo Guerra · Todos los derechos reservados. Consulta el archivo NOTICE.</sub>
