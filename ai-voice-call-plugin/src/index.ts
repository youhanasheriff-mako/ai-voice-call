// AI Voice Call Plugin - Main Export

// Styles should be imported by the consuming application
// import './styles/index.scss';

// Main component
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

// Utility classes
export { AudioRecorder } from './lib/audio-recorder';
export { AudioStreamer } from './lib/audio-streamer';
export { GenAILiveClient } from './lib/genai-live-client';

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

// Re-export commonly used types from @google/genai for convenience
export type {
  GoogleGenAIOptions,
  LiveClientToolResponse,
  LiveServerMessage,
  Part
} from '@google/genai';