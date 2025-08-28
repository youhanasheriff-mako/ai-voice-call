import React, { useState } from 'react';
import FloatingActionButton from './FloatingActionButton';
import MobilePhoneOverlay from './MobilePhoneOverlay';

const FloatingFeature: React.FC = () => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const handleToggleOverlay = () => {
    setIsOverlayOpen(!isOverlayOpen);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
  };

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