import React, { useRef, useState, useEffect } from "react";
import { useAppVisible } from "./utils";
import { syncCuboxToLogseq, CuboxSyncSettings, getDefaultSettings } from "./cuboxSync";
import { CuboxApi } from "./cuboxApi";

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();
  const [settings, setSettings] = useState<CuboxSyncSettings>(getDefaultSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleTestConnection = async () => {
    if (!settings.domain || !settings.apiKey) {
      setTestResult({
        success: false,
        message: "Please enter domain and API key first"
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const api = new CuboxApi(settings.domain, settings.apiKey);
      const result = await api.testConnection();
      setTestResult(result);
      
      if (result.success) {
        (logseq.App as any).showMsg("Connection test successful!", "success");
      } else {
        (logseq.App as any).showMsg(`Connection test failed: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Test connection failed:", error);
      setTestResult({
        success: false,
        message: "Connection test failed, please check network and configuration"
      });
      (logseq.App as any).showMsg("Connection test failed, please check network and configuration", "error");
    } finally {
      setIsTesting(false);
    }
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
            
            {/* Test Connection Button */}
            <div>
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !settings.domain || !settings.apiKey}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isTesting || !settings.domain || !settings.apiKey
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    : "bg-white text-green-600 border border-green-200 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-300 border-t-green-600"></div>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Test Connection</span>
                    </>
                  )}
                </div>
              </button>
              
              {/* Test Result */}
              {testResult && (
                <div className={`mt-3 text-sm p-3 rounded-lg border-l-4 ${
                  testResult.success
                    ? "bg-green-50 text-green-800 border-l-green-400 border border-green-200"
                    : "bg-red-50 text-red-800 border-l-red-400 border border-red-200"
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-6"></div>
            
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
                  Examples: &quot;Reading List&quot;, &quot;Tech Articles, Design&quot;
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
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={settings.autoSync}
                onChange={(e) => updateSettings({ autoSync: e.target.checked })}
              />
              <label htmlFor="autoSync" className="text-sm">Auto sync on startup</label>
            </div>
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-6"></div>
            
            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={isSyncing || !settings.domain || !settings.apiKey}
              className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                isSyncing || !settings.domain || !settings.apiKey
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isSyncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-white"></div>
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync Now</span>
                  </>
                )}
              </div>
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