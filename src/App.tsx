import React, { useState } from 'react';
import './App.scss';
import { InitAIConfig } from './module/components/InitAIConfigComponent';
import { FloatingFeature } from './module/audio/floating-feature';
import { AudioModal } from './module/audio/audio-modal/AudioModal';
import { AudioLines } from 'lucide-react';
import { LiveCallProvider } from './module/contexts/LiveCallContext';

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
      <LiveCallProvider>
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
            <InitAIConfig />
          </main>
        </div>
        <FloatingFeature />
      </LiveCallProvider>
      <AudioModal isOpen={isAudioModalOpen} onClose={handleCloseAudioModal} />
    </div>
  );
}

export default App;
