# BriDownload

BriDownload es una aplicación de escritorio para Windows desarrollada con Electron que permite descargar contenido multimedia utilizando yt-dlp y FFmpeg.

## Características

- Descarga de videos.
- Descarga de audio en MP3.
- Vista previa del contenido.
- Historial de descargas.
- Selección de la carpeta de destino.
- Interfaz sencilla y moderna.

## Tecnologías

- Electron
- Node.js
- JavaScript
- HTML
- CSS
- yt-dlp
- FFmpeg

## Requisitos

- Node.js
- npm
- FFmpeg instalado en Windows
- `yt-dlp.exe` dentro de la carpeta `tools`

## Instalación

Clona el repositorio:

```bash
git clone https://github.com/JosephPerez16/BriDownload.git
```

Instala las dependencias:

```bash
npm install
```

Inicia la aplicación:

```bash
npm start
```

## Generar el instalador

```bash
npm run build
```

El instalador se generará en la carpeta:

```text
dist/
```

## Estructura

```text
BriDownload
│
├── src/
├── tools/
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
```

## Importante

Este repositorio contiene el código fuente de la aplicación.

GitHub Pages no puede ejecutar aplicaciones desarrolladas con Electron, ya que estas se ejecutan directamente en el sistema operativo.

Utiliza la herramienta únicamente para descargar contenido que te pertenezca o cuya descarga esté autorizada.

## Licencia

MIT License.

## Desarrollador

José Ramón Pérez Pimentel

JyB Technology Solutions SRL
