import React, { useState, useEffect } from 'react';
import FloatingActionButton from './FloatingActionButton';
import MobilePhoneOverlay from './MobilePhoneOverlay';
import { useLiveCall } from '../../contexts/LiveCallContext';

const FloatingFeature: React.FC = () => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const { setOverlayCloseCallback } = useLiveCall();

  const handleToggleOverlay = () => {
    setIsOverlayOpen(!isOverlayOpen);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
  };

  useEffect(() => {
    // Register the overlay close callback with the context
    setOverlayCloseCallback(handleCloseOverlay);

    // Cleanup on unmount
    return () => {
      setOverlayCloseCallback(null);
    };
  }, [setOverlayCloseCallback]);

  return (
    <>
      <FloatingActionButton 
        onClick={handleToggleOverlay}
        isActive={isOverlayOpen}
      />
      <MobilePhoneOverlay 
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
      />
    </>
  );
};

export default FloatingFeature;