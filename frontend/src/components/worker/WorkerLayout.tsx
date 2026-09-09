import React, { useState } from 'react';
import { Home, Camera, Clock, User } from 'lucide-react';
import { WorkerHomeView } from './WorkerHomeView';
import { WorkerQrScanView } from './WorkerQrScanView';
import { WorkerCameraScanView } from './WorkerCameraScanView';
import { WorkerScanResultView } from './WorkerScanResultView';
import { WorkerHistoryView } from './WorkerHistoryView';
import { WorkerProfileView } from './WorkerProfileView';
import type { Worker, Reading, DemoBadgeItem, CVAnalyzeResponse, BadgeLookupResponse } from '../../types';

interface WorkerLayoutProps {
  workers: Worker[];
  currentWorker: Worker | null;
  onSelectWorker: (worker: Worker) => void;
  demoBadges: DemoBadgeItem[];
  readings: Reading[];
  onSelectReading: (reading: Reading) => void;
  onReadingSaved: () => void;
  onSignOut: () => void;
  initialPresetScenario?: string | null;
  dataLoading?: boolean;
  dataError?: string | null;
  onRefreshData?: () => void;
}

export const WorkerLayout: React.FC<WorkerLayoutProps> = ({
  workers,
  currentWorker,
  onSelectWorker,
  demoBadges,
  readings,
  onSelectReading,
  onReadingSaved,
  onSignOut,
  initialPresetScenario,
  dataLoading = false,
  dataError = null,
  onRefreshData,
}) => {
  const [workerTab, setWorkerTab] = useState<'home' | 'qr' | 'scan' | 'result' | 'history' | 'profile'>('home');
  const [verifiedBadge, setVerifiedBadge] = useState<BadgeLookupResponse | null>(null);
  const [latestScanResult, setLatestScanResult] = useState<CVAnalyzeResponse | null>(null);
  const [latestScanImage, setLatestScanImage] = useState<string | undefined>(undefined);

  // Filter readings strictly for current worker, fallback to currentWorker.latest_reading
  const workerReadings = readings.filter((r) => !currentWorker || r.worker_id === currentWorker.id);
  const latestReading = workerReadings.length > 0 ? workerReadings[0] : (currentWorker?.latest_reading || null);

  const handleBadgeVerified = (badge: BadgeLookupResponse) => {
    setVerifiedBadge(badge);
    if (badge.worker_id && badge.worker_id !== currentWorker?.id) {
      const match = workers.find((w) => w.id === badge.worker_id);
      if (match) onSelectWorker(match);
    }
    setWorkerTab('scan');
  };

  const handleScanComplete = (result: CVAnalyzeResponse, rawImageSrc?: string) => {
    setLatestScanResult(result);
    setLatestScanImage(rawImageSrc);
    setWorkerTab('result');
  };

  const handleSavedSuccess = () => {
    onReadingSaved();
    setWorkerTab('history');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 relative select-none">
      {/* Dynamic Viewport Content */}
      <div className="flex-1 w-full pb-20 overflow-y-auto">
        {workerTab === 'home' && (
          <WorkerHomeView
            currentWorker={currentWorker}
            workers={workers}
            onSelectWorker={onSelectWorker}
            latestReading={latestReading}
            isLoading={dataLoading}
            isError={!!dataError}
            onRetry={onRefreshData}
            onNavigateScan={() => setWorkerTab('qr')}
            onNavigateHistory={() => setWorkerTab('history')}
          />
        )}

        {workerTab === 'qr' && (
          <WorkerQrScanView
            currentWorker={currentWorker}
            onBadgeVerified={handleBadgeVerified}
            onCancel={() => setWorkerTab('home')}
            onNavigateHistory={() => setWorkerTab('history')}
          />
        )}

        {workerTab === 'scan' && (
          <WorkerCameraScanView
            currentWorker={currentWorker}
            demoBadges={demoBadges}
            onBack={() => setWorkerTab('qr')}
            onScanComplete={handleScanComplete}
            initialPresetId={initialPresetScenario}
            verifiedBadgeId={verifiedBadge?.badge_id}
          />
        )}

        {workerTab === 'result' && latestScanResult && (
          <WorkerScanResultView
            currentWorker={currentWorker}
            result={latestScanResult}
            rawImageSrc={latestScanImage}
            onBack={() => setWorkerTab('scan')}
            onScanAgain={() => setWorkerTab('qr')}
            onSavedSuccess={handleSavedSuccess}
          />
        )}

        {workerTab === 'history' && (
          <WorkerHistoryView
            readings={workerReadings}
            currentWorker={currentWorker}
            onSelectReading={onSelectReading}
          />
        )}

        {workerTab === 'profile' && (
          <WorkerProfileView
            currentWorker={currentWorker}
            onSignOut={onSignOut}
          />
        )}
      </div>

      {/* Floating Bottom Navigation Bar */}
      {workerTab !== 'scan' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-lg border-t border-slate-200 px-6 py-2.5 z-40 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Home Tab */}
            <button
              onClick={() => setWorkerTab('home')}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                workerTab === 'home' ? 'text-sky-700 font-bold' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-mono">Home</span>
            </button>

            {/* Central Dominant Scan Button */}
            <div className="relative -top-5">
              <button
                onClick={() => setWorkerTab('qr')}
                title="Scan Colorimetric Badge"
                className="w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-lg shadow-sky-600/30 transform active:scale-95 transition-all ring-4 ring-slate-50"
              >
                <Camera className="w-6 h-6 stroke-[2.4]" />
              </button>
            </div>

            {/* History Tab */}
            <button
              onClick={() => setWorkerTab('history')}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                workerTab === 'history' ? 'text-sky-700 font-bold' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[10px] font-mono">History</span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setWorkerTab('profile')}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                workerTab === 'profile' ? 'text-sky-700 font-bold' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-mono">Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
