const state = {
  media: null,
  mode: "video",
  downloading: false,
  folder: localStorage.getItem("bri-folder") || "",
  saveHistory: localStorage.getItem("bri-save-history") !== "false",
  history: JSON.parse(localStorage.getItem("bri-history") || "[]"),
  selectedFormatId: ""
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const pageTitles = {
  home: "Nueva descarga",
  history: "Historial",
  settings: "Ajustes"
};

function setView(view) {
  $$(".view").forEach(item => item.classList.remove("active"));
  $$(".nav-item").forEach(item => item.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  $(`.nav-item[data-view="${view}"]`).classList.add("active");
  $("#pageTitle").textContent = pageTitles[view];
  if (view === "history") renderHistory();
}

function showNotice(message, error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.remove("hidden", "error");
  if (error) notice.classList.add("error");
}

function hideNotice() {
  $("#notice").classList.add("hidden");
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const values = hours ? [hours, minutes, secs] : [minutes, secs];
  return values.map(value => String(value).padStart(2, "0")).join(":");
}

function formatBytes(bytes) {
  if (!bytes) return "Tamaño variable";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function setMode(mode) {
  state.mode = mode;
  $$(".mode").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  $("#videoOptions").classList.toggle("hidden", mode !== "video");
  $("#audioOptions").classList.toggle("hidden", mode !== "audio");
}

function renderMedia() {
  const media = state.media;
  $("#thumbnail").src = media.thumbnail || "";
  $("#mediaTitle").textContent = media.title;
  $("#mediaUploader").textContent = media.uploader || "Autor no indicado";
  $("#extractor").textContent = media.extractor || "Contenido detectado";
  $("#duration").textContent = formatDuration(media.duration);

  const menu = $("#formatMenu");
  menu.innerHTML = "";
  const videoFormats = media.formats.filter(format => format.hasVideo);

  const options = videoFormats.length ? videoFormats.map(format => {
    const quality = format.height ? `${format.height}p` : format.resolution || format.note || "Video";
    const fps = format.fps > 30 ? ` · ${format.fps} fps` : "";
    const audio = format.hasAudio ? " · audio incluido" : " · combinará audio";
    return {
      id: format.id,
      label: `${quality}${fps} · ${format.ext.toUpperCase()}${audio} · ${formatBytes(format.filesize)}`
    };
  }) : [{ id: "", label: "Mejor calidad disponible" }];

  state.selectedFormatId = options[0].id;
  $("#formatValue").textContent = options[0].label;

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-select-option";
    button.dataset.value = option.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(option.id === state.selectedFormatId));
    button.textContent = option.label;
    button.classList.toggle("active", option.id === state.selectedFormatId);
    button.addEventListener("click", () => selectFormat(option.id, option.label));
    menu.appendChild(button);
  }

  $("#mediaCard").classList.remove("hidden");
  $("#progressPanel").classList.add("hidden");
  setMode("video");
}


function openFormatMenu() {
  if ($("#formatTrigger").disabled) return;
  $("#formatMenu").classList.remove("hidden");
  $("#formatSelect").classList.add("open");
  $("#formatTrigger").setAttribute("aria-expanded", "true");
}

function closeFormatMenu() {
  $("#formatMenu").classList.add("hidden");
  $("#formatSelect").classList.remove("open");
  $("#formatTrigger").setAttribute("aria-expanded", "false");
}

function selectFormat(id, label) {
  state.selectedFormatId = id;
  $("#formatValue").textContent = label;
  $$(".custom-select-option").forEach(option => {
    const selected = option.dataset.value === id;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-selected", String(selected));
  });
  closeFormatMenu();
}

function addHistory(item) {
  if (!state.saveHistory) return;
  state.history = [item, ...state.history].slice(0, 50);
  localStorage.setItem("bri-history", JSON.stringify(state.history));
}

function renderHistory() {
  const list = $("#historyList");
  const empty = $("#historyEmpty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", state.history.length > 0);

  for (const item of state.history) {
    const row = document.createElement("div");
    row.className = "history-row";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    title.textContent = item.title;
    detail.textContent = `${item.mode === "audio" ? "MP3" : "Video"} · ${item.date}`;
    info.append(title, detail);
    const button = document.createElement("button");
    button.textContent = "Abrir carpeta";
    button.addEventListener("click", () => window.briAPI.openFolder(item.folder));
    row.append(info, button);
    list.appendChild(row);
  }
}

function setDownloading(value) {
  state.downloading = value;
  $("#downloadButton").disabled = value;
  $("#downloadButton").textContent = value ? "Descargando..." : "Descargar";
  $("#cancelButton").classList.toggle("hidden", !value);
  $$(".mode").forEach(button => button.disabled = value);
  $("#formatTrigger").disabled = value;
  if (value) closeFormatMenu();
}

$("#analyzeForm").addEventListener("submit", async event => {
  event.preventDefault();
  const url = $("#urlInput").value.trim();
  hideNotice();
  $("#mediaCard").classList.add("hidden");
  $("#analyzeButton").disabled = true;
  $("#analyzeButton").textContent = "Analizando...";
  const result = await window.briAPI.analyzeUrl(url);
  $("#analyzeButton").disabled = false;
  $("#analyzeButton").textContent = "Analizar";

  if (!result.ok) {
    showNotice(result.error, true);
    return;
  }

  state.media = { ...result.media, sourceUrl: url };
  renderMedia();
});

$("#downloadButton").addEventListener("click", async () => {
  if (!state.media || state.downloading) return;
  hideNotice();
  setDownloading(true);
  $("#progressPanel").classList.remove("hidden");
  $("#progressBar").style.width = "0%";
  $("#progressPercent").textContent = "0%";
  $("#progressText").textContent = "Preparando descarga...";

  const result = await window.briAPI.downloadMedia({
    url: state.media.sourceUrl,
    mode: state.mode,
    formatId: state.mode === "video" ? state.selectedFormatId : "",
    folder: state.folder
  });

  setDownloading(false);

  if (!result.ok) {
    $("#progressPanel").classList.add("hidden");
    showNotice(result.error, !result.cancelled);
    return;
  }

  $("#progressBar").style.width = "100%";
  $("#progressPercent").textContent = "100%";
  $("#progressText").textContent = "Descarga completada";

  addHistory({
    title: state.media.title,
    url: state.media.sourceUrl,
    folder: result.folder,
    mode: state.mode,
    date: new Intl.DateTimeFormat("es-DO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date())
  });

  showNotice("Descarga completada correctamente.");
});

$("#cancelButton").addEventListener("click", async () => {
  if (!state.downloading) return;
  $("#cancelButton").disabled = true;
  $("#progressText").textContent = "Cancelando descarga...";
  await window.briAPI.cancelDownload();
  $("#cancelButton").disabled = false;
});

window.briAPI.onDownloadProgress(data => {
  if (data.type === "status") {
    $("#progressText").textContent = data.text;
    return;
  }

  const percent = Math.max(0, Math.min(100, Number(data.percent) || 0));
  $("#progressBar").style.width = `${percent}%`;
  $("#progressPercent").textContent = `${percent.toFixed(0)}%`;
  const details = [data.speed, data.eta ? `restante ${data.eta}` : ""].filter(Boolean).join(" · ");
  $("#progressText").textContent = details || "Descargando archivo...";
});

$$(".mode").forEach(button => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

$$(".nav-item").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("#chooseFolder").addEventListener("click", async () => {
  const folder = await window.briAPI.chooseDownloadFolder();
  if (!folder) return;
  state.folder = folder;
  localStorage.setItem("bri-folder", folder);
  $("#folderLabel").textContent = folder;
});

$("#saveHistory").checked = state.saveHistory;
$("#saveHistory").addEventListener("change", event => {
  state.saveHistory = event.target.checked;
  localStorage.setItem("bri-save-history", String(event.target.checked));
});

$("#clearHistory").addEventListener("click", () => {
  state.history = [];
  localStorage.removeItem("bri-history");
  renderHistory();
});

if (state.folder) $("#folderLabel").textContent = state.folder;
$("#formatTrigger").addEventListener("click", () => {
  if ($("#formatMenu").classList.contains("hidden")) {
    openFormatMenu();
  } else {
    closeFormatMenu();
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest("#formatSelect")) closeFormatMenu();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeFormatMenu();
});

