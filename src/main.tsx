import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { syncCuboxToLogseq, getDefaultSettings } from "./cuboxSync";

import { logseq as PL } from "../package.json";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

function main() {
  console.info(`#${pluginId}: MAIN`);
  const root = ReactDOM.createRoot(document.getElementById("app")!);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  function createModel() {
    return {
      show() {
        logseq.showMainUI();
      },
      syncCubox: async () => {
        await performAutoSync();
      }
    };
  }

  logseq.provideModel(createModel());
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  });

  const openIconName = "cubox-2-logseq";

  logseq.provideStyle(css`
    .${openIconName} {
      opacity: 0.55;
      font-size: 20px;
      margin-top: 4px;
    }

    .${openIconName}:hover {
      opacity: 0.9;
    }
  `);

  logseq.App.registerUIItem("toolbar", {
    key: openIconName,
    template: `
    <a data-on-click="show">
        <div class="${openIconName}">📚</div>
    </a>    
`,
  });

  // Add command for manual sync
  logseq.App.registerCommand("cubox-sync", {
    key: "cubox-sync-command",
    label: "Sync Cubox articles",
    keybinding: {
      binding: "mod+shift+u"
    }
  }, async () => {
    await performAutoSync();
  });

  // Auto-sync on startup if enabled
  setTimeout(async () => {
    const settings = logseq.settings as any;
    if (settings?.autoSync && settings?.cuboxDomain && settings?.cuboxApiKey) {
      console.log("Performing auto-sync on startup...");
      await performAutoSync();
    }
  }, 3000); // Wait 3 seconds after startup
}

async function performAutoSync() {
  const settings = logseq.settings as any;
  
  if (!settings?.cuboxDomain || !settings?.cuboxApiKey) {
    (logseq.App as any).showMsg("Please configure Cubox settings first", "warning");
    return;
  }

  const syncSettings = {
    domain: settings.cuboxDomain || "",
    apiKey: settings.cuboxApiKey || "",
    targetPageName: settings.targetPageName || "Cubox",
    enableSync: settings.enableSync !== false,
    autoSync: settings.autoSync || false,
    lastSyncTime: settings.lastSyncTime || 0,
    lastSyncCardId: settings.lastSyncCardId || "",
    lastSyncCardUpdateTime: settings.lastSyncCardUpdateTime || "",
    syncFolders: settings.syncFolders || "",
    onlyAnnotated: settings.onlyAnnotated || false
  };

  try {
    (logseq.App as any).showMsg("Starting Cubox sync...", "info");
    
    const result = await syncCuboxToLogseq(syncSettings, (message) => {
      console.log("Sync progress:", message);
    });
    
    // Update settings with sync results
    await logseq.updateSettings({
      lastSyncTime: Date.now(),
      lastSyncCardId: result.lastCardId || syncSettings.lastSyncCardId,
      lastSyncCardUpdateTime: result.lastCardUpdateTime || syncSettings.lastSyncCardUpdateTime
    });
    
    (logseq.App as any).showMsg(
      `Cubox sync completed: ${result.syncedCount} articles synced, ${result.skippedCount} skipped`,
      "success"
    );
  } catch (error) {
    console.error("Auto-sync failed:", error);
    (logseq.App as any).showMsg("Cubox sync failed. Check console for details.", "error");
  }
}

logseq.ready(main).catch(console.error);
