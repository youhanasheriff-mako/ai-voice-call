// AI Voice Call Plugin - Main Export



// Main component
// Styles should be imported by the consuming application
// import './styles/index.scss';

export { default as AIVoiceCallPlugin } from './components/AIVoiceCallPlugin';

// Individual components (for advanced usage)
export { AvatarVideo } from './components/AvatarVideo';
export { ControlTray } from './components/ControlTray';
export { AudioPulse } from './components/AudioPulse';

// Context and hooks
export { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';
export { useLiveAPI } from './hooks/use-live-api';
export { useWebcam } from './hooks/use-webcam';
export { useScreenCapture } from './hooks/use-screen-capture';

// Types
export type {
  AIVoiceCallPluginProps,
  PluginState,
  LiveClientOptions,
  StreamingLog,
  ClientContentLog
} from './types';
export type { UseMediaStreamResult } from './hooks/use-media-stream-mux';
export type { ControlTrayProps } from './components/ControlTray';
export type { AudioPulseProps } from './components/AudioPulse';