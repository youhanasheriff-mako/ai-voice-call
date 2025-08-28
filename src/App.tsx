import React, { useState } from 'react';
import './App.scss';
import { LiveAPIProvider } from './module/contexts/LiveAPIContext';
import { SalesConsultant } from './module/components/SalesConsultant';
import { FloatingFeature } from './module/audio/floating-feature';
import { AudioModal } from './module/audio/audio-modal/AudioModal';
import { AudioLines } from 'lucide-react';
import { LiveClientOptions } from './types';
import { geminiApiKey } from './module/constants';

const apiOptions: LiveClientOptions = {
  apiKey: geminiApiKey,
};

function App() {
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  const handleOpenAudioModal = () => {
    setIsAudioModalOpen(true);
  };

  const handleCloseAudioModal = () => {
    setIsAudioModalOpen(false);
  };

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        <div className="minimal-home">
          <header className="home-header">
            <h1 className="sales-ai-title">Sales AI</h1>
          </header>
          <main className="home-content">
            <button
              className="audio-button"
              onClick={handleOpenAudioModal}
              aria-label="Open Audio Controls"
            >
              <AudioLines size={24} />
            </button>
            <SalesConsultant />
          </main>
        </div>
      </LiveAPIProvider>

      <FloatingFeature />

      <AudioModal isOpen={isAudioModalOpen} onClose={handleCloseAudioModal} />
    </div>
  );
}

export default App;
