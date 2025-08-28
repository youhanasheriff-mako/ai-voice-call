import React, { useState, useEffect, useRef } from 'react';
import './VideoCallInterface.scss';

interface VideoCallInterfaceProps {
  onClose: () => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callStartTimeRef = useRef<number>(Date.now());

  // Simulate call connection
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setIsConnected(true);
      callStartTimeRef.current = Date.now();
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  // Update call duration
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Simulate AI speaking patterns
  useEffect(() => {
    if (!isConnected) return;

    const speakingInterval = setInterval(() => {
      setIsAISpeaking(prev => !prev);
    }, Math.random() * 3000 + 2000); // Random intervals between 2-5 seconds

    return () => clearInterval(speakingInterval);
  }, [isConnected]);

  // Handle video source switching based on AI speaking state
  useEffect(() => {
    if (videoRef.current && isConnected) {
      const videoSrc = isAISpeaking 
        ? '/assets/ai_avatar_talking.mp4' 
        : '/assets/ai_avatar_not_talking.mp4';
      
      videoRef.current.src = videoSrc;
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
    }
  }, [isAISpeaking, isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setIsConnected(false);
    setTimeout(onClose, 500);
  };

  return (
    <div className="video-call-interface">
      {/* Status bar */}
      <div className="status-bar">
        <div className="time">9:41</div>
        <div className="status-indicators">
          <div className="signal-strength">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
          <div className="battery">100%</div>
        </div>
      </div>

      {/* Call header */}
      <div className="call-header">
        <div className="call-status">
          {isConnected ? (
            <>
              <div className="status-text">Connected</div>
              <div className="call-duration">{formatDuration(callDuration)}</div>
            </>
          ) : (
            <div className="status-text connecting">Connecting...</div>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className="video-area">
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
      </div>

      {/* Control buttons */}
      <div className="call-controls">
        <button 
          className={`control-btn ${isMuted ? 'active' : ''}`}
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {isMuted ? (
              <path d="M16 8v-2a4 4 0 0 0-8 0v2m8 0v6a4 4 0 0 1-8 0v-6m8 0h2m-10 0h-2m12 8l-4-4m0 4l4-4" stroke="currentColor" strokeWidth="2"/>
            ) : (
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zM8 11v2a4 4 0 0 0 8 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2"/>
            )}
          </svg>
        </button>

        <button 
          className="control-btn end-call"
          onClick={handleEndCall}
          aria-label="End call"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 7v4a1 1 0 0 0 1 1h3l3-3V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4l3 3h3a1 1 0 0 0 1-1V7a7 7 0 0 0-14 0z" fill="currentColor"/>
          </svg>
        </button>

        <button 
          className={`control-btn ${isSpeakerOn ? 'active' : ''}`}
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          aria-label={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoCallInterface;