import React, { useState, useEffect, useRef } from 'react';
import './VideoCallInterface.scss';
import { useLiveCall } from '../../contexts/LiveCallContext';
import {
  Mic,
  MicOff,
  Phone,
  Volume2,
  MicIcon,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

interface VideoCallInterfaceProps {
  onClose: () => void;
}

const VideoCallInterfaceContent: React.FC<VideoCallInterfaceProps> = ({
  onClose,
}) => {
  const {
    isCallActive,
    callDuration,
    isMuted,
    isSpeakerOn,
    toggleMute,
    toggleSpeaker,
    startCall,
    endCall,
    connected,
    volume,
    callError,
    inVolume,
    microphonePermission,
    microphoneError,
  } = useLiveCall();

  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasInitialized = useRef(false);

  // Start call when component mounts - only once
  useEffect(() => {
    console.log('connected', connected);
    console.log('isCallActive', isCallActive);
    console.log('isConnecting', isConnecting);

    // Only start call if not already connected, not active, not connecting, and hasn't been initialized
    if (
      !connected &&
      !isCallActive &&
      !isConnecting &&
      !hasInitialized.current
    ) {
      console.log('startCall');
      hasInitialized.current = true;
      setIsConnecting(true);
      startCall().finally(() => {
        setIsConnecting(false);
      });
    }

    // Cleanup function to reset initialization state when component unmounts
    return () => {
      hasInitialized.current = false;
      setIsConnecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, isCallActive]); // Removed startCall from dependencies to prevent infinite loop

  // AI speaking detection based on volume
  useEffect(() => {
    if (!connected) {
      setIsAISpeaking(false);
      return;
    }

    // Detect AI speaking based on volume threshold
    const speakingThreshold = 0.01;
    setIsAISpeaking(volume > speakingThreshold);
  }, [connected, volume]);

  // Handle video source switching based on AI speaking state
  useEffect(() => {
    if (videoRef.current && connected) {
      const videoSrc = isAISpeaking
        ? '/assets/ai_avatar_talking.mp4'
        : '/assets/ai_avatar_not_talking.mp4';

      if (videoRef.current.src !== videoSrc) {
        videoRef.current.src = videoSrc;
        videoRef.current.load();
      }
    }
  }, [isAISpeaking, connected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await endCall();
    onClose();
  };

  return (
    <div className="video-call-interface">
      {/* Call header */}
      <div className="call-header">
        <div className="call-status">
          {connected ? (
            <>
              <div className="status-text">Connected</div>
              <div className="call-duration">
                {formatDuration(callDuration)}
              </div>
            </>
          ) : (
            <div className="status-text connecting">Connecting...</div>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className="video-area">
        {callError ? (
          <div className="error-display">
            <div className="error-icon">
              <AlertTriangle size={20} />
            </div>
            <div className="error-message">{callError}</div>
            <div className="error-instructions">
              <p>To fix this:</p>
              <ol>
                <li>
                  Get your free API key from{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google AI Studio
                  </a>
                </li>
                <li>
                  Add it to the .env file:{' '}
                  <code>REACT_APP_GEMINI_API_KEY=your_actual_api_key</code>
                </li>
                <li>Restart the development server</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            <div className="ai-avatar-container">
              <video
                ref={videoRef}
                className={`ai-avatar ${isAISpeaking ? 'speaking' : ''}`}
                autoPlay
                loop
                muted
                playsInline
                poster="/assets/ai_avatar.png"
              />

              {/* Speaking indicator */}
              {isAISpeaking && (
                <div className="speaking-indicator">
                  <div className="wave"></div>
                  <div className="wave"></div>
                  <div className="wave"></div>
                </div>
              )}
            </div>

            {/* Caller info */}
            <div className="caller-info">
              <div className="caller-name">AI Assistant</div>
              <div className="caller-title">Voice Assistant</div>
            </div>
          </>
        )}
      </div>

      {/* Microphone status indicator */}
      {connected && (
        <div className="microphone-status">
          <div className="mic-permission-status">
            {microphonePermission === 'checking' && (
              <div className="permission-checking">
                <MicIcon size={16} /> Requesting microphone access...
              </div>
            )}
            {microphonePermission === 'denied' && (
              <div className="permission-denied">
                <AlertCircle size={16} /> Microphone access denied
              </div>
            )}
            {microphoneError && (
              <div className="mic-error">{microphoneError}</div>
            )}
          </div>

          {microphonePermission === 'granted' && !isMuted && (
            <div className="mic-level-indicator">
              <div className="mic-level-label">Input Level</div>
              <div className="mic-level-bars">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`mic-bar ${
                      inVolume > (i + 1) * 0.2 ? 'active' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {!isMuted && isCallActive && microphonePermission === 'granted' && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording</span>
            </div>
          )}
        </div>
      )}

      {/* Control buttons */}
      <div className="call-controls">
        <button
          className={`control-btn ${isMuted ? 'active' : ''} ${
            inVolume > 0.1 ? 'has-input speaking' : ''
          }`}
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          {/* Microphone level indicator on button */}
          {!isMuted && microphonePermission === 'granted' && (
            <div
              className="mic-level-ring"
              style={{
                opacity: Math.min(inVolume * 3, 1),
                transform: `scale(${1 + inVolume * 0.5})`,
              }}
            ></div>
          )}
          {!isMuted && inVolume > 0.1 && <div className="speaking-ring"></div>}
        </button>

        <button
          className="control-btn end-call"
          onClick={handleEndCall}
          aria-label="End call"
        >
          <Phone size={24} />
        </button>

        <button
          className={`control-btn ${isSpeakerOn ? 'active' : ''}`}
          onClick={toggleSpeaker}
          aria-label={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
        >
          <Volume2 size={24} />
        </button>
      </div>
    </div>
  );
};

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = props => {
  return <VideoCallInterfaceContent {...props} />;
};

export default VideoCallInterface;
