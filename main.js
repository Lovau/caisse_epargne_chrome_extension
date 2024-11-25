// Service Worker (main.js)

// Injecte les scripts nécessaires dans l'onglet actif, puis exécute startCSVDownload
function injectAndStart(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ["jquery-2.min.js"],
    },
    () => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["data_to_csv.js"],
        },
        () => {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
              if (typeof startCSVDownload === "function") {
                startCSVDownload();
              } else {
                console.error("La fonction startCSVDownload n'est pas définie !");
              }
            },
          });
        },
      );
    },
  );
}

// Gestion des clics sur l'icône de l'extension
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id) {
    console.log("Clic sur l'icône détecté. ID de l'onglet :", tab.id);
    injectAndStart(tab.id);
  } else {
    console.error("Impossible d'identifier l'onglet actif.");
  }
});

// // Événement déclenché quand l'extension est installée ou mise à jour
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installée ou mise à jour");
});

// // Gérer dynamiquement l'affichage de l'icône de l'extension
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Vérifie si l'URL correspond à un site supporté
  if (tab.url && tab.url.includes("www.caisse-epargne.fr")) {
    // Active l'icône pour cet onglet
    chrome.action.enable(tabId);
  } else {
    // Désactive l'icône pour les autres onglets
    chrome.action.disable(tabId);
  }
});
