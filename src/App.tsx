import React, { useRef, useState, useEffect } from "react";
import { useAppVisible } from "./utils";
import { syncCuboxToLogseq, CuboxSyncSettings, getDefaultSettings } from "./cuboxSync";

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();
  const [settings, setSettings] = useState<CuboxSyncSettings>(getDefaultSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  useEffect(() => {
    // Load settings from logseq
    const savedSettings = logseq.settings as any;
    if (savedSettings) {
      setSettings({
        domain: savedSettings.cuboxDomain || "",
        apiKey: savedSettings.cuboxApiKey || "",
        targetPageName: savedSettings.targetPageName || "Cubox",
        enableSync: savedSettings.enableSync || false,
        autoSync: savedSettings.autoSync || false,
        lastSyncTime: savedSettings.lastSyncTime || 0,
        lastSyncCardId: savedSettings.lastSyncCardId || "",
        lastSyncCardUpdateTime: savedSettings.lastSyncCardUpdateTime || "",
        syncFolders: savedSettings.syncFolders || "",
        onlyAnnotated: savedSettings.onlyAnnotated || false
      });
      
      if (savedSettings.lastSyncTime) {
        setLastSyncTime(new Date(savedSettings.lastSyncTime).toLocaleString());
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<CuboxSyncSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    logseq.updateSettings({
      cuboxDomain: updatedSettings.domain,
      cuboxApiKey: updatedSettings.apiKey,
      targetPageName: updatedSettings.targetPageName,
      enableSync: updatedSettings.enableSync,
      autoSync: updatedSettings.autoSync,
      lastSyncTime: updatedSettings.lastSyncTime,
      lastSyncCardId: updatedSettings.lastSyncCardId,
      lastSyncCardUpdateTime: updatedSettings.lastSyncCardUpdateTime,
      syncFolders: updatedSettings.syncFolders,
      onlyAnnotated: updatedSettings.onlyAnnotated
    });
  };

  const handleSync = async () => {
    if (!settings.domain || !settings.apiKey) {
      (logseq.App as any).showMsg("Please configure Cubox domain and API key first", "warning");
      return;
    }

    if (isSyncing) {
      (logseq.App as any).showMsg("Sync is already in progress", "warning");
      return;
    }

    setIsSyncing(true);
    setNotification("Starting sync...");

    try {
      const result = await syncCuboxToLogseq(settings, setNotification);
      const newSyncTime = Date.now();
      const updatedSettings = {
        ...settings,
        lastSyncTime: newSyncTime,
        lastSyncCardId: result.lastCardId || settings.lastSyncCardId,
        lastSyncCardUpdateTime: result.lastCardUpdateTime || settings.lastSyncCardUpdateTime
      };
      updateSettings(updatedSettings);
      setLastSyncTime(new Date(newSyncTime).toLocaleString());
      
      (logseq.App as any).showMsg(`Sync completed: ${result.syncedCount} articles synced`, "success");
    } catch (error) {
      console.error("Sync failed:", error);
      (logseq.App as any).showMsg("Sync failed. Please check settings and try again.", "error");
    } finally {
      setIsSyncing(false);
      setNotification(null);
    }
  };

  if (visible) {
    return (
      <main
        className="backdrop-filter backdrop-blur-md fixed inset-0 flex items-center justify-center"
        onClick={(e) => {
          if (!innerRef.current?.contains(e.target as any)) {
            window.logseq.hideMainUI();
          }
        }}
      >
        <div ref={innerRef} className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[500px] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Cubox Sync</h2>
            <button
              onClick={() => window.logseq.hideMainUI()}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Domain and API Key Settings */}
            <div>
              <label className="block text-sm font-medium mb-1">Cubox Domain</label>
              <input
                type="text"
                value={settings.domain}
                onChange={(e) => updateSettings({ domain: e.target.value })}
                placeholder="example.cubox.pro"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder="Your Cubox API key"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Target Page Name</label>
              <input
                type="text"
                value={settings.targetPageName}
                onChange={(e) => updateSettings({ targetPageName: e.target.value })}
                placeholder="Cubox"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            
            {/* Sync Rules Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Sync Rules</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">Sync Folders</label>
                <input
                  type="text"
                  value={settings.syncFolders}
                  onChange={(e) => updateSettings({ syncFolders: e.target.value })}
                  placeholder="Leave empty for all folders, or enter folder names separated by commas"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: "Reading List", "Tech Articles, Design"
                </p>
              </div>
              
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="onlyAnnotated"
                    checked={settings.onlyAnnotated}
                    onChange={(e) => updateSettings({ onlyAnnotated: e.target.checked })}
                  />
                  <label htmlFor="onlyAnnotated" className="text-sm">
                    Only sync articles with highlights/annotations
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, only articles that have highlights or notes will be synced
                </p>
              </div>
            </div>
            
            {/* Sync Controls */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={settings.autoSync}
                onChange={(e) => updateSettings({ autoSync: e.target.checked })}
              />
              <label htmlFor="autoSync" className="text-sm">Auto sync on startup</label>
            </div>
            
            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={isSyncing || !settings.domain || !settings.apiKey}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isSyncing || !settings.domain || !settings.apiKey
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
            
            {/* Status */}
            {notification && (
              <div className="text-sm text-blue-600 text-center">
                {notification}
              </div>
            )}
            
            {lastSyncTime && (
              <div className="text-xs text-gray-500 text-center">
                Last sync: {lastSyncTime}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }
  return null;
}

export default App;