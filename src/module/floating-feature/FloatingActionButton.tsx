import React from 'react';
import { Phone } from 'lucide-react';
import './FloatingActionButton.scss';

interface FloatingActionButtonProps {
  onClick: () => void;
  isActive?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  onClick, 
  isActive = false 
}) => {
  return (
    <button 
      className={`floating-action-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label="Open AI Voice Call"
    >
      <div className="fab-icon">
        <Phone size={24} />
      </div>
      <div className="fab-pulse"></div>
    </button>
  );
};

export default FloatingActionButton;