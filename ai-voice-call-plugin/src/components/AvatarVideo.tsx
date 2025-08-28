import React, { useRef, useState, useEffect } from 'react';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import classNames from 'classnames';

export const AvatarVideo: React.FC = () => {
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
    <div className="ai-voice-plugin__avatar">
      <video
        ref={avatarRef}
        key={currentSrc}
        className={classNames('ai-voice-plugin__avatar-video', {
          'ai-voice-plugin__avatar-video--hidden': !connected,
          'ai-voice-plugin__avatar-video--speaking': isSpeaking,
          'ai-voice-plugin__avatar-video--high-confidence': confidence > 0.7,
          'ai-voice-plugin__avatar-video--medium-confidence': confidence > 0.4 && confidence <= 0.7,
          'ai-voice-plugin__avatar-video--low-confidence': confidence <= 0.4,
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
        <div className="ai-voice-plugin__speech-indicators">
          <div className={classNames('ai-voice-plugin__speech-state', { 
            'ai-voice-plugin__speech-state--active': isSpeaking 
          })}>
            {isSpeaking ? 'Speaking' : 'Silent'}
          </div>
          <div className="ai-voice-plugin__confidence-bar">
            <div
              className="ai-voice-plugin__confidence-fill"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <div className="ai-voice-plugin__speech-duration">
            {speechDuration > 0 && `${Math.round(speechDuration / 1000)}s`}
          </div>
        </div>
      )}
    </div>
  );
};