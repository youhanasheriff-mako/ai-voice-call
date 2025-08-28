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

import { useRef, useState, useEffect } from 'react';
import './App.scss';
import { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';
import SidePanel from './components/side-panel/SidePanel';
import { SalesConsultant } from './components/altair/SalesConsultant';
import ControlTray from './components/control-tray/ControlTray';
import cn from 'classnames';
import { LiveClientOptions } from './types';
import { FloatingFeature } from './module/floating-feature';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error('set REACT_APP_GEMINI_API_KEY in .env');
}

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
};

// Avatar component with robust AI speech detection
function AvatarVideo() {
  const { volume, connected } = useLiveAPIContext();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(
    '/assets/ai_avatar_not_talking.mp4'
  );
  const [confidence, setConfidence] = useState(0);
  const [speechDuration, setSpeechDuration] = useState(0);
  const avatarRef = useRef<HTMLVideoElement>(null);

  // Enhanced detection thresholds and parameters
  const SPEAKING_THRESHOLD = 0.01;
  const SILENCE_THRESHOLD = 0.005;
  const MIN_SPEECH_DURATION = 200;
  const MIN_SILENCE_DURATION = 300;
  const DEBOUNCE_TIME = 150;

  // State tracking refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeHistoryRef = useRef<number[]>([]);
  const lastStateChangeRef = useRef<number>(Date.now());
  const lastVolumeUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!connected || volume === undefined) {
      // Reset state when disconnected
      setIsSpeaking(false);
      setConfidence(0);
      setSpeechDuration(0);
      volumeHistoryRef.current = [];
      return;
    }

    const now = Date.now();
    lastVolumeUpdateRef.current = now;

    // Update volume history for trend analysis
    volumeHistoryRef.current.push(volume);
    if (volumeHistoryRef.current.length > 10) {
      volumeHistoryRef.current.shift();
    }

    // Calculate confidence based on multiple factors
    const calculateConfidence = () => {
      let conf = 0;

      // Volume-based confidence
      if (volume > SPEAKING_THRESHOLD) {
        conf += Math.min(volume / SPEAKING_THRESHOLD, 1) * 0.4;
      }

      // Trend analysis confidence
      if (volumeHistoryRef.current.length >= 3) {
        const recentAvg =
          volumeHistoryRef.current.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const overallAvg =
          volumeHistoryRef.current.reduce((a, b) => a + b, 0) /
          volumeHistoryRef.current.length;

        if (recentAvg > overallAvg) {
          conf += 0.2;
        }
      }

      // Consistency confidence
      const consistentVolumes = volumeHistoryRef.current.filter(
        v => v > SILENCE_THRESHOLD
      ).length;
      conf += (consistentVolumes / volumeHistoryRef.current.length) * 0.3;

      // Duration-based confidence boost
      const stateDuration = now - lastStateChangeRef.current;
      if (isSpeaking && stateDuration > MIN_SPEECH_DURATION) {
        conf += 0.1;
      }

      return Math.min(conf, 1);
    };

    const newConfidence = calculateConfidence();
    setConfidence(newConfidence);

    // Determine if AI should be speaking based on enhanced logic
    const shouldBeSpeaking = () => {
      const stateDuration = now - lastStateChangeRef.current;

      if (isSpeaking) {
        // Continue speaking if volume is above silence threshold or haven't been silent long enough
        return (
          volume > SILENCE_THRESHOLD || stateDuration < MIN_SILENCE_DURATION
        );
      } else {
        // Start speaking if volume is above threshold and confidence is high enough
        return volume > SPEAKING_THRESHOLD && newConfidence > 0.3;
      }
    };

    const speaking = shouldBeSpeaking();

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the speaking state change to prevent rapid switching
    debounceTimerRef.current = setTimeout(() => {
      if (speaking !== isSpeaking) {
        setIsSpeaking(speaking);
        lastStateChangeRef.current = now;
        setSpeechDuration(0);
      } else {
        // Update duration for current state
        setSpeechDuration(now - lastStateChangeRef.current);
      }
    }, DEBOUNCE_TIME);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [volume, connected, isSpeaking]);

  useEffect(() => {
    const newSrc = isSpeaking
      ? '/assets/ai_avatar_talking.mp4'
      : '/assets/ai_avatar_not_talking.mp4';

    if (newSrc !== currentSrc && avatarRef.current && connected) {
      const video = avatarRef.current;

      // Immediate source update for better responsiveness
      setCurrentSrc(newSrc);

      // Force video reload and play
      video.src = newSrc;
      video.load();

      // Ensure video plays after load
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video started playing successfully
            console.log(
              'Avatar video switched to:',
              isSpeaking ? 'talking' : 'not talking'
            );
          })
          .catch(error => {
            console.warn('Avatar video play failed:', error);
            // Retry play after a short delay
            setTimeout(() => {
              video.play().catch(console.error);
            }, 100);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, connected]);

  // Handle video load and play
  const handleLoadedData = () => {
    if (avatarRef.current && connected) {
      const video = avatarRef.current;
      video.currentTime = 0; // Reset to beginning
      video.play().catch(error => {
        console.warn('Video play on load failed:', error);
      });
    }
  };

  // Handle video errors
  const handleVideoError = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    console.error('Avatar video error:', e.currentTarget.error);
    // Try to reload the video
    if (avatarRef.current) {
      setTimeout(() => {
        if (avatarRef.current) {
          avatarRef.current.load();
        }
      }, 1000);
    }
  };

  return (
    <div className="avatar-container">
      <video
        ref={avatarRef}
        key={currentSrc}
        className={cn('ai-avatar', {
          hidden: !connected,
          speaking: isSpeaking,
          'high-confidence': confidence > 0.7,
          'medium-confidence': confidence > 0.4 && confidence <= 0.7,
          'low-confidence': confidence <= 0.4,
        })}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src={currentSrc}
        onLoadedData={handleLoadedData}
        onError={handleVideoError}
        onCanPlay={() => {
          // Ensure video plays when it can
          if (avatarRef.current && connected) {
            avatarRef.current.play().catch(console.error);
          }
        }}
      />
      {connected && (
        <div className="speech-indicators">
          <div className={cn('speech-state', { active: isSpeaking })}>
            {isSpeaking ? 'Speaking' : 'Silent'}
          </div>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <div className="speech-duration">
            {speechDuration > 0 && `${Math.round(speechDuration / 1000)}s`}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* APP goes here */}
              <SalesConsultant />
              <AvatarVideo />
              <video
                className={cn('stream', {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={true}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>

      {/* Floating Action Button Feature */}
      <FloatingFeature />
    </div>
  );
}

export default App;
