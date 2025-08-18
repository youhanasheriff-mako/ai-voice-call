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

import React from 'react';
import './avatar.scss';

export interface AvatarProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ 
  className = '', 
  size = 'large', 
  animated = true 
}) => {
  return (
    <div className={`ai-avatar ${size} ${animated ? 'animated' : ''} ${className}`}>
      <div className="avatar-container">
        <svg 
          viewBox="0 0 200 200" 
          className="avatar-svg"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="AI Assistant Avatar"
          aria-describedby="avatar-desc"
        >
          <title id="avatar-desc">AI Assistant Avatar - A friendly geometric face representing the AI assistant</title>
          {/* Background circle with gradient */}
          <defs>
            <radialGradient id="bgGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="var(--md-sys-color-primary-container)" />
              <stop offset="100%" stopColor="var(--md-sys-color-surface-container-high)" />
            </radialGradient>
            <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--md-sys-color-primary)" />
              <stop offset="100%" stopColor="var(--md-sys-color-tertiary)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>
          
          {/* Background */}
          <circle cx="100" cy="100" r="95" fill="url(#bgGradient)" />
          
          {/* AI Face - Geometric design */}
          <g className="ai-face">
            {/* Head outline */}
            <circle cx="100" cy="100" r="60" fill="url(#faceGradient)" opacity="0.9" />
            
            {/* Eyes */}
            <circle cx="85" cy="85" r="8" fill="var(--md-sys-color-on-primary)" className="eye left-eye" />
            <circle cx="115" cy="85" r="8" fill="var(--md-sys-color-on-primary)" className="eye right-eye" />
            
            {/* Eye highlights */}
            <circle cx="87" cy="83" r="3" fill="var(--md-sys-color-surface)" className="eye-highlight" />
            <circle cx="117" cy="83" r="3" fill="var(--md-sys-color-surface)" className="eye-highlight" />
            
            {/* Mouth - subtle smile */}
            <path d="M 85 110 Q 100 120 115 110" 
                  stroke="var(--md-sys-color-on-primary)" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeLinecap="round" 
                  className="mouth" />
            
            {/* Tech elements - circuit-like patterns */}
            <g className="tech-elements" opacity="0.6">
              <circle cx="70" cy="70" r="2" fill="var(--md-sys-color-tertiary)" className="tech-dot" />
              <circle cx="130" cy="70" r="2" fill="var(--md-sys-color-tertiary)" className="tech-dot" />
              <circle cx="70" cy="130" r="2" fill="var(--md-sys-color-tertiary)" className="tech-dot" />
              <circle cx="130" cy="130" r="2" fill="var(--md-sys-color-tertiary)" className="tech-dot" />
              
              <line x1="70" y1="70" x2="85" y2="85" 
                    stroke="var(--md-sys-color-tertiary)" 
                    strokeWidth="1" 
                    className="tech-line" />
              <line x1="130" y1="70" x2="115" y2="85" 
                    stroke="var(--md-sys-color-tertiary)" 
                    strokeWidth="1" 
                    className="tech-line" />
            </g>
          </g>
          
          {/* Outer ring with pulse effect */}
          <circle cx="100" cy="100" r="90" 
                  fill="none" 
                  stroke="var(--md-sys-color-primary)" 
                  strokeWidth="2" 
                  opacity="0.5" 
                  className="pulse-ring" />
        </svg>
        
        {/* Status indicator */}
        <div className="status-indicator">
          <div className="status-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default Avatar;