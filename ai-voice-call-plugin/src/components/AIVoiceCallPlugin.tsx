import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Phone,
  PhoneCall,
  X,
  Minus,
  Maximize2,
} from 'lucide-react';
import { LiveAPIProvider } from '../contexts/LiveAPIContext';
import { AIVoiceCallPluginProps, PluginState } from '../types';
import { AvatarVideo } from './AvatarVideo';
import { ControlTray } from './ControlTray';

const AIVoiceCallPlugin: React.FC<AIVoiceCallPluginProps> = ({
  apiKey,
  options = {},
  className = '',
  position = 'bottom-right',
  theme = {},
  onOpen,
  onClose,
  onCallStart,
  onCallEnd,
}) => {
  const [pluginState, setPluginState] = useState<PluginState>({
    isOpen: false,
    isMinimized: false,
    isConnected: false,
    isLoading: false,
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const apiOptions = {
    apiKey,
    ...options,
  };

  // Handle keyboard navigation and accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pluginState.isOpen) {
        handleClose();
      }

      // Tab trapping within overlay when open
      if (event.key === 'Tab' && pluginState.isOpen && overlayRef.current) {
        const focusableElements = overlayRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pluginState.isOpen]);

  // Handle click outside to close overlay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pluginState.isOpen &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pluginState.isOpen]);

  const handleOpen = useCallback(() => {
    setPluginState(prev => ({ ...prev, isOpen: true, isMinimized: false }));
    onOpen?.();
    
    // Focus first focusable element in overlay after it opens
    setTimeout(() => {
      const firstFocusable = overlayRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }, 100);
  }, [onOpen]);

  const handleClose = useCallback(() => {
    setPluginState(prev => ({ ...prev, isOpen: false, isMinimized: false }));
    onClose?.();
    
    // Return focus to the floating button
    buttonRef.current?.focus();
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    setPluginState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  const handleCallStart = useCallback(() => {
    setPluginState(prev => ({ ...prev, isConnected: true }));
    onCallStart?.();
  }, [onCallStart]);

  const handleCallEnd = useCallback(() => {
    setPluginState(prev => ({ ...prev, isConnected: false }));
    onCallEnd?.();
  }, [onCallEnd]);

  const getPositionClasses = () => {
    const baseClass = 'ai-voice-plugin';
    const positionClass = `${baseClass}--${position}`;
    return `${baseClass} ${positionClass} ${className}`;
  };

  const getOverlayPositionClasses = () => {
    const baseClass = 'ai-voice-plugin__overlay';
    const positionClass = `${baseClass}--${position}`;
    const minimizedClass = pluginState.isMinimized
      ? `${baseClass}--minimized`
      : '';
    return `${baseClass} ${positionClass} ${minimizedClass}`;
  };

  const FloatingButton = () => (
    <button
      ref={buttonRef}
      className={`ai-voice-plugin__floating-button ${
        pluginState.isConnected ? 'ai-voice-plugin__floating-button--connected' : ''
      }`}
      onClick={handleOpen}
      style={{
        backgroundColor: theme.primaryColor || undefined,
      }}
      aria-label="Open AI Voice Call"
      aria-expanded={pluginState.isOpen}
    >
      {pluginState.isConnected ? (
        <PhoneCall className="ai-voice-plugin__floating-button-icon" />
      ) : (
        <Phone className="ai-voice-plugin__floating-button-icon" />
      )}
      {pluginState.isConnected && (
        <div className="ai-voice-plugin__floating-button-pulse" />
      )}
    </button>
  );

  const OverlayContent = () => (
    <div
      ref={overlayRef}
      className={getOverlayPositionClasses()}
      style={{
        backgroundColor: theme.backgroundColor || '#ffffff',
        color: theme.textColor || '#333333',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-voice-plugin-title"
    >
      {/* Header */}
      <div className="ai-voice-plugin__header">
        <h3 id="ai-voice-plugin-title" className="ai-voice-plugin__title">
          AI Voice Assistant
        </h3>
        <div className="ai-voice-plugin__header-controls">
          <button
            className="ai-voice-plugin__control-btn"
            onClick={handleMinimize}
            aria-label={pluginState.isMinimized ? 'Maximize' : 'Minimize'}
          >
            {pluginState.isMinimized ? <Maximize2 /> : <Minus />}
          </button>
          <button
            className="ai-voice-plugin__control-btn ai-voice-plugin__control-btn--close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
      </div>

      {/* Content */}
      {!pluginState.isMinimized && (
        <div className="ai-voice-plugin__content">
          <LiveAPIProvider options={apiOptions}>
            <div className="ai-voice-plugin__avatar-container">
              <AvatarVideo />
            </div>
            <div className="ai-voice-plugin__controls">
              <ControlTray
                videoRef={React.createRef<HTMLVideoElement>()}
                supportsVideo={true}
                enableEditingSettings={false}
              />
            </div>
          </LiveAPIProvider>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Floating Button */}
      <div className={getPositionClasses()}>
        <FloatingButton />
      </div>

      {/* Overlay Portal */}
      {pluginState.isOpen &&
        createPortal(
          <div 
            className="ai-voice-plugin__backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
          >
            <OverlayContent />
          </div>,
          document.body
        )}
    </>
  );
};

export default AIVoiceCallPlugin;
export { AIVoiceCallPlugin };
