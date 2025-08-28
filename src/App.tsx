/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
