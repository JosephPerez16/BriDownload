const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("briAPI", {
  analyzeUrl: url => ipcRenderer.invoke("analyze-url", url),
  chooseDownloadFolder: () => ipcRenderer.invoke("choose-download-folder"),
  downloadMedia: payload => ipcRenderer.invoke("download-media", payload),
  cancelDownload: () => ipcRenderer.invoke("cancel-download"),
  openFolder: folder => ipcRenderer.invoke("open-folder", folder),
  onDownloadProgress: callback => {
    ipcRenderer.removeAllListeners("download-progress");
    ipcRenderer.on("download-progress", (_, data) => callback(data));
  }
});
