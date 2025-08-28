import React, { useEffect, useState } from 'react';
import VideoCallInterface from './VideoCallInterface';
import { X } from 'lucide-react';
import './MobilePhoneOverlay.scss';

interface MobilePhoneOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobilePhoneOverlay: React.FC<MobilePhoneOverlayProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Delay content appearance for smooth animation
      setTimeout(() => setShowContent(true), 200);
    } else {
      setShowContent(false);
      // Delay animation end to allow content to fade out
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isAnimating && !isOpen) {
    return null;
  }

  return (
    <div 
      className={`mobile-phone-overlay ${isOpen ? 'open' : 'closing'}`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="AI Voice Call Interface"
    >
      <div className="phone-container">
        <div className="phone-frame">
          {/* Phone notch */}
          <div className="phone-notch">
            <div className="notch-speaker"></div>
            <div className="notch-camera"></div>
          </div>
          
          {/* Phone screen */}
          <div className="phone-screen">
            {showContent && (
              <VideoCallInterface onClose={onClose} />
            )}
          </div>
          
          {/* Phone home indicator */}
          <div className="phone-home-indicator"></div>
        </div>
        
        {/* Close button */}
        <button 
          className="close-button"
          onClick={onClose}
          aria-label="Close call interface"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default MobilePhoneOverlay;