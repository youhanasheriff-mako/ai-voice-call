/**
 * Live Call Provider for Floating Feature
 *
 * Provides live API context specifically for the floating call feature
 * with proper error handling and call lifecycle management.
 */

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useLiveAPI, UseLiveAPIResults } from '../hooks/use-live-api';
import { LiveClientOptions } from '../types';
import { audioChunkStorage } from '../lib/audio-chunk-storage';
import { audioIndexedDBStorage } from '../lib/indexeddb-storage';
import { AudioRecorder } from '../lib/audio-recorder';
import { geminiApiKey } from '../constants';

interface LiveCallContextType extends UseLiveAPIResults {
  // Call state management
  isCallActive: boolean;
  callDuration: number;
  callError: string | null;

  // Call lifecycle methods
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;

  // Audio controls
  isMuted: boolean;
  isSpeakerOn: boolean;
  inVolume: number;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  microphonePermission: 'granted' | 'denied' | 'prompt' | 'checking';
  microphoneError: string | null;
  requestMicrophonePermission: () => Promise<boolean>;

  // Session management
  currentSessionId: string | null;
  sessionMetadata: any | null;

  // Recovery state
  isRecovering: boolean;
  retryCount: number;
  recoverConnection: () => Promise<void>;

  // Storage management
  saveSessionData: (data: any) => Promise<void>;
  loadSessionData: (sessionId: string) => Promise<any | null>;
  clearSessionData: (sessionId: string) => Promise<void>;

  // Performance metrics
  latencyMetrics: {
    audioLatency: number;
    networkLatency: number;
    processingLatency: number;
  };
  audioBuffer: Float32Array[];
  bufferSize: number;
}

const LiveCallContext = createContext<LiveCallContextType | undefined>(
  undefined
);

export interface LiveCallProviderProps {
  children: ReactNode;
}

const apiOptions: LiveClientOptions = {
  apiKey: geminiApiKey,
};

export const LiveCallProvider: React.FC<LiveCallProviderProps> = ({
  children,
}) => {
  const liveAPI = useLiveAPI(apiOptions);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const [inVolume, setInVolume] = useState(0);

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const maxRetries = 3;
  const [callStartTime, setCallStartTime] = useState<number>(0);

  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [microphonePermission, setMicrophonePermission] = useState<
    'granted' | 'denied' | 'prompt' | 'checking'
  >('prompt');
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);

  // Performance optimization states
  const [audioBuffer, setAudioBuffer] = useState<Float32Array[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bufferSize, setBufferSize] = useState(4096);
  const [latencyMetrics, setLatencyMetrics] = useState({
    audioLatency: 0,
    networkLatency: 0,
    processingLatency: 0,
  });

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<any | null>(null);

  // Initialize AudioRecorder
  useEffect(() => {
    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorder();
      console.log('🎤 AudioRecorder initialized');
    }

    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
        console.log('🎤 AudioRecorder cleaned up');
      }
    };
  }, []);

  // Handle audio recording when call is active
  useEffect(() => {
    const audioRecorder = audioRecorderRef.current;
    if (!audioRecorder) return;

    const onData = (base64: string) => {
      if (liveAPI.connected && !isMuted) {
        console.log('🎤 Sending audio data to AI:', { size: base64.length });
        liveAPI.client.sendRealtimeInput([
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64,
          },
        ]);
      }
    };

    const onVolume = (volume: number) => {
      setInVolume(volume);
    };

    if (liveAPI.connected && isCallActive && !isMuted) {
      console.log('🎤 Starting audio recording...');
      audioRecorder
        .on('data', onData)
        .on('volume', onVolume)
        .start()
        .catch(error => {
          console.error('🎤 Failed to start audio recording:', error);

          // Update microphone permission state based on error
          if (error.name === 'NotAllowedError') {
            setMicrophonePermission('denied');
            setMicrophoneError(
              'Microphone access denied. Please allow microphone access and try again.'
            );
            setCallError(
              'Microphone access denied. Please check your browser permissions.'
            );
          } else if (error.name === 'NotFoundError') {
            setMicrophonePermission('denied');
            setMicrophoneError(
              'No microphone found. Please connect a microphone.'
            );
            setCallError(
              'No microphone detected. Please connect a microphone and try again.'
            );
          } else {
            setMicrophoneError(`Microphone error: ${error.message}`);
            setCallError(
              'Failed to access microphone. Please check your audio settings.'
            );
          }
        });
    } else {
      console.log('🎤 Stopping audio recording...');
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off('data', onData).off('volume', onVolume);
    };
  }, [liveAPI.connected, isCallActive, isMuted, liveAPI.client]);

  // Update call duration
  useEffect(() => {
    if (!isCallActive || !callStartTime) return;

    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive, callStartTime]);

  // Monitor connection status and handle state changes
  useEffect(() => {
    const handleConnectionChange = async () => {
      if (liveAPI.connected && !isCallActive) {
        setIsCallActive(true);
        setCallStartTime(Date.now());
        setCallError(null);

        // Generate session ID
        const sessionId = `call_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        setCurrentSessionId(sessionId);

        // Initialize audio session storage and metadata
        try {
          await audioChunkStorage.getSessionInfo(sessionId);

          // Initialize session metadata in IndexedDB
          const metadata = {
            sessionId,
            startTime: Date.now(),
            status: 'active',
            callType: 'voice',
            participants: ['user', 'ai'],
            audioSettings: {
              sampleRate: 16000,
              channels: 1,
              codec: 'pcm',
            },
          };

          // Save session metadata to IndexedDB
          const key = `session_metadata_${sessionId}`;
          await audioIndexedDBStorage.setItem(key, JSON.stringify(metadata));
          setSessionMetadata(metadata);
        } catch (error: any) {
          console.error('Failed to initialize session storage:', error);
          setCallError('Failed to initialize session storage');
        }
      } else if (!liveAPI.connected && isCallActive) {
        // Connection lost during active call
        setIsCallActive(false);
        setCallDuration(0);
        setCallStartTime(0);

        // Clean up session
        if (currentSessionId) {
          console.log(
            'Connection lost, cleaning up session:',
            currentSessionId
          );
          setCurrentSessionId(null);
          setSessionMetadata(null);
        }
      }
    };

    handleConnectionChange();
  }, [liveAPI.connected, isCallActive, currentSessionId]);

  // Monitor for connection errors
  useEffect(() => {
    const handleError = (error: any) => {
      console.error('Live API error:', error);
      setCallError(error?.message || 'Connection error occurred');
    };

    const handleDisconnect = () => {
      if (isCallActive) {
        console.log('Unexpected disconnection during call');
        setCallError('Connection lost');
      }
    };

    // Listen for client events
    liveAPI.client.on('error', handleError);
    liveAPI.client.on('close', handleDisconnect);

    return () => {
      liveAPI.client.off('error', handleError);
      liveAPI.client.off('close', handleDisconnect);
    };
  }, [liveAPI.client, isCallActive]);

  // Clear error after some time (unless recovering)
  useEffect(() => {
    if (callError && !isRecovering) {
      const timer = setTimeout(() => {
        setCallError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [callError, isRecovering]);

  // Helper function to determine if error should trigger retry
  const shouldRetry = useCallback((error: any) => {
    const retryableErrors = [
      'network error',
      'connection timeout',
      'temporary failure',
      'service unavailable',
    ];

    const errorMessage = (error?.message || '').toLowerCase();
    return retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError)
    );
  }, []);

  // Recovery function for connection issues
  const recoverConnection = useCallback(async () => {
    if (isRecovering || retryCount >= maxRetries) return;

    console.log('Attempting connection recovery...');
    setIsRecovering(true);

    try {
      // First try to disconnect cleanly
      await liveAPI.disconnect().catch(() => {});

      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attempt to reconnect
      await startCall();
    } catch (error) {
      console.error('Recovery failed:', error);
      setCallError('Connection recovery failed');
    } finally {
      setIsRecovering(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecovering, retryCount, maxRetries, liveAPI]);

  const runOnce = useRef(true);

  const startCall = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting || liveAPI.connected) {
      console.log(
        '⚠️ Connection already in progress or established, skipping startCall'
      );
      return;
    }

    console.log('🚀 Starting call initialization...');
    setIsConnecting(true);
    try {
      setCallError(null);
      setIsRecovering(false);
      console.log('✅ Call state reset completed');

      // Connect to the live API with performance monitoring
      console.log('🔌 Attempting to connect to live API...');
      const connectionStart = performance.now();
      await liveAPI.connect();

      if (runOnce.current) {
        setTimeout(() => {
          liveAPI.client.send({ text: 'Hi' });
        }, 500);
        runOnce.current = false;
      }
      const connectionTime = performance.now() - connectionStart;
      console.log(
        `✅ Connection established in ${connectionTime.toFixed(2)}ms`
      );

      // Update latency metrics
      setLatencyMetrics(prev => ({
        ...prev,
        networkLatency: connectionTime,
      }));
      console.log('📊 Latency metrics updated:', {
        networkLatency: connectionTime,
      });

      setRetryCount(0); // Reset retry count on successful connection
      console.log('🔄 Retry count reset to 0');

      // Initialize audio performance monitoring
      if (liveAPI.client) {
        console.log('🎵 Setting up audio performance monitoring...');
        liveAPI.client.on('audio', (audioData: any) => {
          const processingStart = performance.now();

          // Process audio with buffering for smoother playback
          if (audioData && audioData.data) {
            console.log('🎵 Processing audio chunk:', {
              size: audioData.data.length,
            });
            setAudioBuffer(prev => {
              const newBuffer = [...prev, audioData.data];
              // Keep buffer size manageable for low latency
              const trimmedBuffer = newBuffer.slice(-10); // Keep last 10 chunks
              console.log('📦 Audio buffer updated:', {
                chunks: trimmedBuffer.length,
              });
              return trimmedBuffer;
            });
          }

          const processingTime = performance.now() - processingStart;
          const audioLatency = audioData.timestamp
            ? Date.now() - audioData.timestamp
            : 0;
          setLatencyMetrics(prev => ({
            ...prev,
            processingLatency: processingTime,
            audioLatency: audioLatency,
          }));
          console.log('📊 Audio metrics updated:', {
            processingTime: processingTime.toFixed(2),
            audioLatency,
          });
        });
        console.log('✅ Audio monitoring setup completed');
      } else {
        console.warn('⚠️ Live API client not available for audio monitoring');
      }

      console.log('🎉 Call initialization completed successfully!');
    } catch (error) {
      console.error('❌ Failed to start call:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start call';
      setCallError(errorMessage);
      console.error('💥 Error details:', {
        message: errorMessage,
        retryCount,
        maxRetries,
      });

      // Attempt automatic recovery for certain errors
      if (retryCount < maxRetries && shouldRetry(error)) {
        const retryDelay = Math.pow(2, retryCount) * 1000;
        console.log(
          `🔄 Attempting recovery (${
            retryCount + 1
          }/${maxRetries}) in ${retryDelay}ms...`
        );
        setIsRecovering(true);
        setRetryCount(prev => prev + 1);

        // Use recoverConnection instead of recursive startCall
        setTimeout(() => {
          console.log('🔄 Executing recovery connection...');
          recoverConnection();
        }, retryDelay);
      } else {
        console.error('💀 Maximum retries reached or error not recoverable');
      }

      throw error;
    } finally {
      setIsConnecting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAPI, retryCount, maxRetries, shouldRetry, isConnecting]); // Added isConnecting to dependencies

  const endCall = useCallback(async () => {
    try {
      await liveAPI.disconnect();
      setIsCallActive(false);
      setCallDuration(0);
      setCallStartTime(0);
      setCallError(null);
      setIsRecovering(false);
      setRetryCount(0);
      setIsConnecting(false);
      runOnce.current = true;

      // Explicitly stop audio recording before disconnecting
      if (audioRecorderRef.current) {
        console.log(
          '🎤 Explicitly stopping audio recording during call end...'
        );
        audioRecorderRef.current.stop();
      }

      // Audio session cleanup and data persistence
      if (currentSessionId) {
        try {
          // Get session statistics before cleanup
          const sessionStats = await liveAPI.client.getSessionAudioStats();
          if (sessionStats) {
            console.log('Call session stats:', {
              sessionId: currentSessionId,
              duration: Math.floor(sessionStats.sessionDuration / 1000),
              userChunks: sessionStats.userChunks,
              aiChunks: sessionStats.aiChunks,
              totalChunks: sessionStats.totalChunks,
            });
          }

          // Update session metadata with completion info
          if (sessionMetadata) {
            const completedMetadata = {
              ...sessionMetadata,
              endTime: Date.now(),
              duration: callDuration,
              status: 'completed',
              sessionStats: sessionStats || {},
            };

            // Save final session metadata to IndexedDB
            const key = `session_metadata_${currentSessionId}`;
            await audioIndexedDBStorage.setItem(
              key,
              JSON.stringify(completedMetadata)
            );

            // Also save to session history for analytics
            const historyKey = `session_history_${Date.now()}`;
            await audioIndexedDBStorage.setItem(
              historyKey,
              JSON.stringify({
                sessionId: currentSessionId,
                summary: {
                  duration: callDuration,
                  endTime: Date.now(),
                  totalChunks: sessionStats?.totalChunks || 0,
                  status: 'completed',
                },
              })
            );
          }

          // Verify audio chunk storage
          await audioChunkStorage
            .getSessionInfo(currentSessionId)
            .then(sessionInfo => {
              console.log('Session completed successfully:', sessionInfo);
            })
            .catch(error => {
              console.warn('Failed to retrieve final session info:', error);
            });

          console.log('Call session ended successfully:', currentSessionId);
        } catch (error) {
          console.error('Error during session cleanup:', error);
        } finally {
          setCurrentSessionId(null);
          setSessionMetadata(null);
        }
      }
    } catch (error) {
      console.error('Failed to end call:', error);
      setCallError(
        error instanceof Error ? error.message : 'Failed to end call'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAPI, currentSessionId, callDuration]);

  const toggleMute = useCallback(async () => {
    try {
      setIsMuted(prev => {
        const newMuted = !prev;
        console.log(
          newMuted ? '🔇 Muting microphone' : '🎤 Unmuting microphone'
        );

        // Audio recording will be handled by the useEffect that watches isMuted
        return newMuted;
      });
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      setCallError('Failed to toggle microphone');
    }
  }, []);

  const toggleSpeaker = useCallback(async () => {
    try {
      setIsSpeakerOn(prev => {
        const newSpeakerOn = !prev;
        // TODO: Implement speaker toggle functionality
        // This would involve controlling audio output
        console.log(newSpeakerOn ? 'Enabling speaker' : 'Disabling speaker');
        return newSpeakerOn;
      });
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
      setCallError('Failed to toggle speaker');
    }
  }, []);

  // Storage management functions
  const saveSessionData = useCallback(async (data: any) => {
    try {
      const key = `session_metadata_${data.sessionId}`;
      await audioIndexedDBStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save session data:', error);
      throw error;
    }
  }, []);

  const loadSessionData = useCallback(async (sessionId: string) => {
    try {
      const key = `session_metadata_${sessionId}`;
      const data = await audioIndexedDBStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load session data:', error);
      return null;
    }
  }, []);

  const clearSessionData = useCallback(async (sessionId: string) => {
    try {
      const key = `session_metadata_${sessionId}`;
      await audioIndexedDBStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear session data:', error);
      throw error;
    }
  }, []);

  const requestMicrophonePermission =
    useCallback(async (): Promise<boolean> => {
      try {
        setMicrophonePermission('checking');
        setMicrophoneError(null);

        // Check if navigator.mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone access is not supported in this browser');
        }

        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // Stop the stream immediately as we just needed permission
        stream.getTracks().forEach(track => track.stop());

        setMicrophonePermission('granted');
        console.log('🎤 Microphone permission granted');
        return true;
      } catch (error: any) {
        console.error('🎤 Microphone permission denied:', error);
        setMicrophonePermission('denied');

        if (error.name === 'NotAllowedError') {
          setMicrophoneError(
            'Microphone access denied. Please allow microphone access in your browser settings.'
          );
        } else if (error.name === 'NotFoundError') {
          setMicrophoneError(
            'No microphone found. Please connect a microphone and try again.'
          );
        } else if (error.name === 'NotSupportedError') {
          setMicrophoneError(
            'Microphone access is not supported in this browser.'
          );
        } else {
          setMicrophoneError(`Microphone error: ${error.message}`);
        }

        return false;
      }
    }, []);

  const contextValue: LiveCallContextType = {
    ...liveAPI,
    isCallActive,
    callDuration,
    callError,
    startCall,
    endCall,
    isMuted,
    isSpeakerOn,
    inVolume,
    toggleMute,
    toggleSpeaker,
    microphonePermission,
    microphoneError,
    requestMicrophonePermission,
    currentSessionId,
    sessionMetadata,
    isRecovering,
    retryCount,
    recoverConnection,
    saveSessionData,
    loadSessionData,
    clearSessionData,
    latencyMetrics,
    audioBuffer,
    bufferSize,
  };

  return (
    <LiveCallContext.Provider value={contextValue}>
      {children}
    </LiveCallContext.Provider>
  );
};

export const useLiveCall = () => {
  const context = useContext(LiveCallContext);
  if (!context) {
    throw new Error('useLiveCall must be used within a LiveCallProvider');
  }
  return context;
};
