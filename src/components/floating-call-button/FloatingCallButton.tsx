import React, { useState, useRef, useEffect } from 'react';
import { useLiveAPIContext } from '../../module/contexts/LiveAPIContext';
import cn from 'classnames';
import './FloatingCallButton.scss';

interface FloatingCallButtonProps {
  onCallStart?: () => void;
  onCallEnd?: () => void;
}

const FloatingCallButton: React.FC<FloatingCallButtonProps> = ({
  onCallStart,
  onCallEnd,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const { connected, volume } = useLiveAPIContext();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect AI speaking based on volume
  useEffect(() => {
    if (connected && volume !== undefined) {
      const speaking = volume > 0.01;
      setIsSpeaking(speaking);
    } else {
      setIsSpeaking(false);
    }
  }, [volume, connected]);

  // Handle call duration timer
  useEffect(() => {
    if (isInCall && connected) {
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }

      intervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          setCallDuration(
            Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          );
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      callStartTimeRef.current = null;
      setCallDuration(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isInCall, connected]);

  const handleFloatingButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleStartCall = () => {
    setIsInCall(true);
    onCallStart?.();
  };

  const handleEndCall = () => {
    setIsInCall(false);
    setIsOpen(false);
    onCallEnd?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className={cn('floating-call-button', {
          'in-call': isInCall,
          connected: connected,
        })}
        onClick={handleFloatingButtonClick}
        aria-label="Open AI Call Interface"
      >
        {isInCall ? (
          <div className="call-indicator">
            <div className="pulse-ring"></div>
            <span className="material-icons">phone</span>
          </div>
        ) : (
          <span className="material-icons">phone</span>
        )}
      </button>

      {/* Mobile Phone Interface */}
      {isOpen && (
        <div className={cn('phone-interface', { 'in-call': isInCall })}>
          <div className="phone-screen">
            {/* Phone Header */}
            <div className="phone-header">
              <div className="status-bar">
                <span className="time">
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="indicators">
                  <span
                    className={cn('signal', { connected: connected })}
                  ></span>
                  <span className="battery">100%</span>
                </div>
              </div>
            </div>

            {/* Call Interface */}
            <div className="call-content">
              {!isInCall ? (
                /* Pre-call Screen */
                <div className="pre-call">
                  <div className="contact-info">
                    <div className="avatar-container">
                      <div className="avatar-circle">
                        <span className="material-icons">smart_toy</span>
                      </div>
                    </div>
                    <h3 className="contact-name">AI Assistant</h3>
                    <p className="contact-status">
                      {connected ? 'Ready to talk' : 'Connecting...'}
                    </p>
                  </div>

                  <div className="call-actions">
                    <button
                      className="call-button start-call"
                      onClick={handleStartCall}
                      disabled={!connected}
                    >
                      <span className="material-icons">phone</span>
                    </button>
                    <button
                      className="call-button close-button"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Call Screen */
                <div className="active-call">
                  <div className="call-info">
                    <h3 className="caller-name">AI Assistant</h3>
                    <p className="call-duration">
                      {formatDuration(callDuration)}
                    </p>
                    <p className="call-status">
                      {isSpeaking ? 'Speaking...' : 'Listening...'}
                    </p>
                  </div>

                  <div className="ai-avatar-container">
                    <div
                      className={cn('ai-avatar-circle', {
                        speaking: isSpeaking,
                        listening: !isSpeaking && connected,
                      })}
                    >
                      <video
                        className="ai-avatar-video"
                        autoPlay
                        loop
                        muted
                        playsInline
                        src={
                          isSpeaking
                            ? '/assets/ai_avatar_talking.mp4'
                            : '/assets/ai_avatar_not_talking.mp4'
                        }
                      />
                      {isSpeaking && (
                        <div className="speaking-indicator">
                          <div className="wave"></div>
                          <div className="wave"></div>
                          <div className="wave"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="call-controls">
                    <button className="control-button mute">
                      <span className="material-icons">mic_off</span>
                    </button>
                    <button
                      className="control-button end-call"
                      onClick={handleEndCall}
                    >
                      <span className="material-icons">call_end</span>
                    </button>
                    <button className="control-button speaker">
                      <span className="material-icons">volume_up</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingCallButton;
