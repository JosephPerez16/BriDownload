const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let activeDownload = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#080A0F",
    title: "BriDownload",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function ytDlpPath() {
  const file = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const developmentPath = path.join(__dirname, "..", "tools", file);
  const packagedPath = path.join(process.resourcesPath, "tools", file);
  return app.isPackaged ? packagedPath : developmentPath;
}

function sendProgress(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("download-progress", payload);
  }
}

function runYtDlp(args, options = {}) {
  return new Promise((resolve, reject) => {
    const bin = ytDlpPath();

    if (!fs.existsSync(bin)) {
      reject(new Error("No se encontró yt-dlp.exe dentro de la carpeta tools."));
      return;
    }

    const child = spawn(bin, args, {
      windowsHide: true,
      shell: false
    });

    if (options.download) activeDownload = child;

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", data => {
      const text = data.toString();
      stdout += text;

      for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith("BRI:")) continue;
        const [, percent = "0", speed = "", eta = ""] = line.split(":");
        sendProgress({
          type: "progress",
          percent: Number(percent) || 0,
          speed: speed.trim(),
          eta: eta.trim()
        });
      }
    });

    child.stderr.on("data", data => {
      stderr += data.toString();
    });

    child.on("error", error => {
      if (options.download) activeDownload = null;
      reject(error);
    });

    child.on("close", code => {
      if (options.download) activeDownload = null;

      if (code === 0) {
        resolve(stdout);
        return;
      }

      if (options.cancelled?.()) {
        reject(new Error("Descarga cancelada."));
        return;
      }

      reject(new Error(stderr.trim() || `yt-dlp terminó con código ${code}`));
    });
  });
}

ipcMain.handle("analyze-url", async (_, url) => {
  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("El enlace debe comenzar con http o https.");
    }

    const output = await runYtDlp([
      "--dump-single-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      url
    ]);

    const info = JSON.parse(output);
    const unique = new Map();

    for (const format of info.formats || []) {
      const hasVideo = Boolean(format.vcodec && format.vcodec !== "none");
      const hasAudio = Boolean(format.acodec && format.acodec !== "none");
      if (!format.format_id || (!hasVideo && !hasAudio)) continue;

      const item = {
        id: String(format.format_id),
        ext: format.ext || "",
        resolution: format.resolution || (format.height ? `${format.height}p` : ""),
        height: Number(format.height || 0),
        fps: Number(format.fps || 0),
        filesize: Number(format.filesize || format.filesize_approx || 0),
        hasVideo,
        hasAudio,
        note: format.format_note || "",
        codec: format.vcodec || ""
      };

      const key = `${item.height}-${item.fps}-${item.ext}-${item.hasAudio}`;
      const previous = unique.get(key);
      if (!previous || item.filesize > previous.filesize) unique.set(key, item);
    }

    const formats = [...unique.values()].sort((a, b) => {
      if (a.hasVideo !== b.hasVideo) return a.hasVideo ? -1 : 1;
      if (a.height !== b.height) return b.height - a.height;
      return b.fps - a.fps;
    });

    return {
      ok: true,
      media: {
        title: info.title || "Contenido multimedia",
        uploader: info.uploader || info.channel || "",
        duration: Number(info.duration || 0),
        thumbnail: info.thumbnail || "",
        extractor: info.extractor_key || info.extractor || "",
        webpageUrl: info.webpage_url || url,
        formats
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "No fue posible analizar el enlace."
    };
  }
});

ipcMain.handle("choose-download-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"]
  });

  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
});

ipcMain.handle("download-media", async (_, payload) => {
  let cancelled = false;

  try {
    const { url, mode, formatId, folder } = payload;
    const outputFolder = folder || app.getPath("downloads");
    fs.mkdirSync(outputFolder, { recursive: true });

    const outputTemplate = path.join(outputFolder, "%(title).180B [%(id)s].%(ext)s");
    const args = [
      "--no-playlist",
      "--newline",
      "--windows-filenames",
      "--progress-template",
      "download:BRI:%(progress._percent_str)s:%(progress._speed_str)s:%(progress._eta_str)s",
      "-o",
      outputTemplate
    ];

    if (mode === "audio") {
      args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
    } else if (formatId) {
      args.push("-f", `${formatId}+bestaudio/best`, "--merge-output-format", "mp4");
    } else {
      args.push("-f", "bv*+ba/b", "--merge-output-format", "mp4");
    }

    args.push(url);
    sendProgress({ type: "status", text: "Preparando descarga..." });
    await runYtDlp(args, { download: true, cancelled: () => cancelled });

    return { ok: true, folder: outputFolder };
  } catch (error) {
    if (error.message === "Descarga cancelada.") cancelled = true;
    return {
      ok: false,
      cancelled,
      error: error.message || "No fue posible completar la descarga."
    };
  }
});

ipcMain.handle("cancel-download", async () => {
  if (!activeDownload) return false;
  activeDownload.kill();
  activeDownload = null;
  return true;
});

ipcMain.handle("open-folder", async (_, folder) => {
  if (!folder) return false;
  return (await shell.openPath(folder)) === "";
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
