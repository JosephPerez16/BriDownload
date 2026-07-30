# BriDownload

Aplicación de escritorio personal creada con Electron, HTML, CSS, JavaScript, yt-dlp y FFmpeg.

## Requisitos

- Node.js instalado.
- npm instalado.
- yt-dlp.exe dentro de la carpeta `tools`.
- FFmpeg instalado en Windows.

## Instalación

Abre el proyecto en Visual Studio Code y ejecuta:

```powershell
npm install
```

Después inicia la aplicación:

```powershell
npm start
```

## Instalar yt-dlp

Descarga `yt-dlp.exe` desde el repositorio oficial de yt-dlp y colócalo aquí:

```text
BriDownload/tools/yt-dlp.exe
```

## Instalar FFmpeg

En PowerShell:

```powershell
winget install Gyan.FFmpeg
```

Reinicia la terminal después de instalarlo.

## Generar instalador EXE

```powershell
npm run build
```

El instalador aparecerá dentro de:

```text
dist/
```

## Importante

- GitHub puede alojar el código fuente del proyecto.
- GitHub Pages no puede ejecutar esta aplicación porque Electron necesita ejecutarse en la computadora.
- Utiliza la herramienta únicamente con contenido propio, autorizado o cuya descarga esté permitida.