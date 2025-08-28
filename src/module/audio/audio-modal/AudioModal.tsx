import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  audioChunkStorage,
  AudioSession,
  AudioChunk,
} from '../../lib/audio-chunk-storage';
import { Play, Pause, Square, Volume2, X, Loader2, CheckCircle, Link } from 'lucide-react';
import './AudioModal.scss';

export interface AudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export const AudioModal: React.FC<AudioModalProps> = ({
  isOpen,
  onClose,
  sessionId,
}) => {
  const [sessionInfo, setSessionInfo] = useState<AudioSession | null>(null);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [mergedAudio, setMergedAudio] = useState<Uint8Array | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<
    string | undefined
  >(sessionId);
  const [isMerged, setIsMerged] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [isViewingMergedSession, setIsViewingMergedSession] =
    useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  // Load available sessions
  const loadAvailableSessions = useCallback(async () => {
    try {
      const sessions = await audioChunkStorage.getSessionIds();
      setAvailableSessions(sessions);

      if (!selectedSessionId && sessions.length > 0) {
        setSelectedSessionId(sessions[0]);
      }
    } catch (err) {
      console.error('Failed to load available sessions:', err);
      setError('Failed to load available sessions');
    }
  }, [selectedSessionId]);

  // Check if session is merged
  const checkMergeStatus = useCallback(async (baseSessionId: string) => {
    try {
      const merged = await audioChunkStorage.isMergedAudioAvailable(
        baseSessionId
      );
      setIsMerged(merged);
    } catch (err) {
      console.warn('Failed to check merge status:', err);
      setIsMerged(false);
    }
  }, []);

  // Load session data
  const loadSessionData = useCallback(
    async (sessionId: string) => {
      if (!sessionId) return;

      setLoading(true);
      setError(null);

      try {
        // Check if this is a merged session
        const isMergedSession = sessionId.endsWith('_merged');
        setIsViewingMergedSession(isMergedSession);

        // Load session info and chunks
        const [info, chunks] = await Promise.all([
          audioChunkStorage.getSessionInfo(sessionId),
          audioChunkStorage.getAudioChunksBySession(sessionId),
        ]);

        if (!info) {
          throw new Error('Session not found');
        }

        setSessionInfo(info);
        setAudioChunks(chunks);

        // Merge audio chunks
        const merged = await audioChunkStorage.mergeSessionAudio(sessionId);
        setMergedAudio(merged);

        // Create audio buffer
        await createAudioBuffer(
          merged,
          info.sampleRate || 44100,
          info.channels || 1
        );

        // Check if this session has been merged (extract base session ID)
        const baseSessionId = sessionId.replace(/_user$|_ai$/, '');
        await checkMergeStatus(baseSessionId);
      } catch (err) {
        console.error('Failed to load session data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load session data'
        );
      } finally {
        setLoading(false);
      }
    },
    [checkMergeStatus]
  );

  // Create audio buffer from merged data
  const createAudioBuffer = useCallback(
    async (audioData: Uint8Array, sampleRate: number, channels: number) => {
      try {
        await initializeAudioContext();

        if (!audioContextRef.current) {
          throw new Error('Audio context not available');
        }

        // Convert Uint8Array to Float32Array for audio buffer
        // This is a simplified conversion - in practice, you'd need proper audio format handling
        const samples = audioData.length / (channels * 2); // Assuming 16-bit audio
        const audioBuffer = audioContextRef.current.createBuffer(
          channels,
          samples,
          sampleRate
        );

        for (let channel = 0; channel < channels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          for (let i = 0; i < samples; i++) {
            const sampleIndex = i * channels * 2 + channel * 2;
            if (sampleIndex + 1 < audioData.length) {
              // Convert 16-bit PCM to float
              const sample =
                audioData[sampleIndex] | (audioData[sampleIndex + 1] << 8);
              channelData[i] =
                sample < 32768 ? sample / 32768 : (sample - 65536) / 32768;
            }
          }
        }

        audioBufferRef.current = audioBuffer;
        setPlaybackState(prev => ({ ...prev, duration: audioBuffer.duration }));
      } catch (err) {
        console.error('Failed to create audio buffer:', err);
        setError('Failed to prepare audio for playback');
      }
    },
    [initializeAudioContext]
  );

  // Playback controls
  const play = useCallback(async () => {
    try {
      await initializeAudioContext();

      if (
        !audioContextRef.current ||
        !audioBufferRef.current ||
        !gainNodeRef.current
      ) {
        throw new Error('Audio not ready for playback');
      }

      // Stop any existing playback
      stop();

      // Create new source node
      sourceNodeRef.current = audioContextRef.current.createBufferSource();
      sourceNodeRef.current.buffer = audioBufferRef.current;
      sourceNodeRef.current.connect(gainNodeRef.current);

      // Set volume
      gainNodeRef.current.gain.value = playbackState.volume;

      // Handle playback end
      sourceNodeRef.current.onended = () => {
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        }));
        pauseTimeRef.current = 0;
      };

      // Start playback
      const startOffset = playbackState.isPaused ? pauseTimeRef.current : 0;
      sourceNodeRef.current.start(0, startOffset);
      startTimeRef.current = audioContextRef.current.currentTime - startOffset;

      setPlaybackState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
      }));
    } catch (err) {
      console.error('Failed to start playback:', err);
      setError('Failed to start playback');
    }
  }, [initializeAudioContext, playbackState.volume, playbackState.isPaused]);

  const pause = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      pauseTimeRef.current =
        audioContextRef.current.currentTime - startTimeRef.current;
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;

      setPlaybackState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: true,
        currentTime: pauseTimeRef.current,
      }));
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    startTimeRef.current = 0;
    pauseTimeRef.current = 0;

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }

    setPlaybackState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  // Handle merge button click
  const handleMergeAudio = useCallback(async () => {
    if (!selectedSessionId || isMerging || isMerged) return;

    setIsMerging(true);
    setError(null);

    try {
      // Extract base session ID
      const baseSessionId = selectedSessionId.replace(/_user$|_ai$/, '');

      // Merge audio synchronously
      const mergedAudio = await audioChunkStorage.mergeSessionAudioSynchronized(
        baseSessionId
      );

      if (mergedAudio.byteLength === 0) {
        throw new Error('No audio data found to merge');
      }

      // Save merged audio
      await audioChunkStorage.saveMergedAudio(baseSessionId, mergedAudio, {
        sampleRate: sessionInfo?.sampleRate || 16000,
        channels: sessionInfo?.channels || 1,
        compress: true,
      });

      setIsMerged(true);
      console.log(
        `Successfully merged and saved audio for session: ${baseSessionId}`
      );
    } catch (err) {
      console.error('Failed to merge audio:', err);
      setError(
        `Failed to merge audio: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setIsMerging(false);
    }
  }, [selectedSessionId, isMerging, isMerged, sessionInfo]);

  // Update current time during playback
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (playbackState.isPlaying && audioContextRef.current) {
      intervalId = setInterval(() => {
        const currentTime =
          audioContextRef.current!.currentTime - startTimeRef.current;
        setPlaybackState(prev => ({ ...prev, currentTime }));

        if (currentTime >= playbackState.duration) {
          stop();
        }
      }, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [playbackState.isPlaying, playbackState.duration, stop]);

  // Load data when modal opens or session changes
  useEffect(() => {
    if (isOpen) {
      loadAvailableSessions();
    }
  }, [isOpen, loadAvailableSessions]);

  useEffect(() => {
    if (isOpen && selectedSessionId) {
      loadSessionData(selectedSessionId);
    }
  }, [isOpen, selectedSessionId, loadSessionData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stop]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="audio-modal-overlay" onClick={onClose}>
      <div className="audio-modal" onClick={e => e.stopPropagation()}>
        <div className="audio-modal__header">
          <h2>Audio Session Player</h2>
          <button className="audio-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="audio-modal__content">
          {/* Session Selection */}
          <div className="audio-modal__session-selector">
            <label htmlFor="session-select">Select Session:</label>
            <select
              id="session-select"
              value={selectedSessionId || ''}
              onChange={e => setSelectedSessionId(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose a session...</option>
              {availableSessions.map(id => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="audio-modal__loading">
              <div className="spinner"></div>
              <span>Loading audio session...</span>
            </div>
          )}

          {error && (
            <div className="audio-modal__error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {sessionInfo && !loading && (
            <>
              {/* Session Information */}
              <div className="audio-modal__session-info">
                <h3>Session Information</h3>
                <div className="session-details">
                  <div className="detail-item">
                    <span className="label">Session ID:</span>
                    <span className="value">{sessionInfo.sessionId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Chunks:</span>
                    <span className="value">{sessionInfo.totalChunks}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">
                      {formatTime(sessionInfo.totalDuration / 1000)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Sample Rate:</span>
                    <span className="value">
                      {sessionInfo.sampleRate
                        ? `${sessionInfo.sampleRate} Hz`
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Channels:</span>
                    <span className="value">
                      {sessionInfo.channels || 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">File Size:</span>
                    <span className="value">
                      {mergedAudio
                        ? formatFileSize(mergedAudio.byteLength)
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Start Time:</span>
                    <span className="value">
                      {new Date(sessionInfo.startTime).toLocaleString()}
                    </span>
                  </div>
                  {sessionInfo.endTime && (
                    <div className="detail-item">
                      <span className="label">End Time:</span>
                      <span className="value">
                        {new Date(sessionInfo.endTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Player */}
              <div className="audio-modal__player">
                <h3>Audio Player</h3>

                {/* Progress Bar */}
                <div className="player-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          (playbackState.currentTime / playbackState.duration) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="time-display">
                    <span>{formatTime(playbackState.currentTime)}</span>
                    <span>{formatTime(playbackState.duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="player-controls">
                  <button
                    className="control-btn play-pause"
                    onClick={playbackState.isPlaying ? pause : play}
                    disabled={!audioBufferRef.current}
                  >
                    {playbackState.isPlaying ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>

                  <button
                    className="control-btn stop"
                    onClick={stop}
                    disabled={
                      !playbackState.isPlaying && !playbackState.isPaused
                    }
                  >
                    <Square size={20} />
                  </button>

                  <div className="volume-control">
                    <Volume2 size={20} />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={playbackState.volume}
                      onChange={e => setVolume(parseFloat(e.target.value))}
                      className="volume-slider"
                    />
                    <span>{Math.round(playbackState.volume * 100)}%</span>
                  </div>
                </div>

                {/* Merge Audio Button */}
                {!isViewingMergedSession && (
                  <div className="merge-controls">
                    <button
                      className={`merge-btn ${isMerged ? 'merged' : ''}`}
                      onClick={handleMergeAudio}
                      disabled={isMerging || isMerged || !selectedSessionId}
                    >
                      {isMerging ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Merging...
                        </>
                      ) : isMerged ? (
                        <>
                          <CheckCircle size={16} /> Merged & Saved
                        </>
                      ) : (
                        <>
                          <Link size={16} /> Merge & Save Audio
                        </>
                      )}
                    </button>
                    {isMerged && (
                      <p className="merge-info">
                        Audio has been merged and saved with session ID:{' '}
                        <code>
                          {selectedSessionId?.replace(/_user$|_ai$/, '')}_merged
                        </code>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Chunk List */}
              <div className="audio-modal__chunks">
                <h3>Audio Chunks ({audioChunks.length})</h3>
                <div className="chunks-list">
                  {audioChunks.map((chunk, index) => (
                    <div key={chunk.id} className="chunk-item">
                      <div className="chunk-info">
                        <span className="chunk-index">#{index + 1}</span>
                        <span className="chunk-id">{chunk.id}</span>
                        <span className="chunk-timestamp">
                          {new Date(chunk.timestamp).toLocaleTimeString()}
                        </span>
                        {chunk.duration && (
                          <span className="chunk-duration">
                            {formatTime(chunk.duration / 1000)}
                          </span>
                        )}
                        <span className="chunk-size">
                          {formatFileSize(
                            chunk.data instanceof ArrayBuffer
                              ? chunk.data.byteLength
                              : chunk.data.byteLength
                          )}
                        </span>
                        {chunk.compressed && (
                          <span className="chunk-compressed">
                            📦 Compressed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioModal;
