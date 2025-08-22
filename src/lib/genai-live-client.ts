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

import {
  Content,
  GoogleGenAI,
  LiveCallbacks,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerMessage,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
  Session,
} from '@google/genai';

import { EventEmitter } from 'eventemitter3';
import { difference } from 'lodash';
import { LiveClientOptions, StreamingLog } from '../types';
import { base64ToArrayBuffer } from './utils';
import { audioChunkStorage } from './audio-chunk-storage';

/**
 * Event types that can be emitted by the MultimodalLiveClient.
 * Each event corresponds to a specific message from GenAI or client state change.
 */
export interface LiveClientEventTypes {
  // Emitted when audio data is received
  audio: (data: ArrayBuffer) => void;
  // Emitted when the connection closes
  close: (event: CloseEvent) => void;
  // Emitted when content is received from the server
  content: (data: LiveServerContent) => void;
  // Emitted when an error occurs
  error: (error: ErrorEvent) => void;
  // Emitted when the server interrupts the current generation
  interrupted: () => void;
  // Emitted for logging events
  log: (log: StreamingLog) => void;
  // Emitted when the connection opens
  open: () => void;
  // Emitted when the initial setup is complete
  setupcomplete: () => void;
  // Emitted when a tool call is received
  toolcall: (toolCall: LiveServerToolCall) => void;
  // Emitted when a tool call is cancelled
  toolcallcancellation: (
    toolcallCancellation: LiveServerToolCallCancellation
  ) => void;
  // Emitted when the current turn is complete
  turncomplete: () => void;
}

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class GenAILiveClient extends EventEmitter<LiveClientEventTypes> {
  protected client: GoogleGenAI;

  private _status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  public get status() {
    return this._status;
  }

  private _session: Session | null = null;
  public get session() {
    return this._session;
  }

  private _model: string | null = null;
  public get model() {
    return this._model;
  }

  protected config: LiveConnectConfig | null = null;
  private _sessionId: string | null = null;
  private _audioChunkIndex: number = 0;
  private _sessionStartTime: number = 0;
  private _userAudioIndex: number = 0;
  private _aiAudioIndex: number = 0;

  public getConfig() {
    return { ...this.config };
  }

  public getCurrentSessionId(): string | null {
    return this._sessionId;
  }

  /**
   * Gets the merged audio for the current session with proper synchronization
   * @param options - Configuration for audio merging
   * @returns Promise resolving to merged audio data
   */
  public async getMergedSessionAudio(options?: {
    sampleRate?: number;
    channels?: number;
    silenceThreshold?: number;
    maxGapFill?: number;
  }): Promise<Uint8Array> {
    if (!this._sessionId) {
      throw new Error('No active session');
    }

    // Extract base session ID (remove any existing suffixes)
    const baseSessionId = this._sessionId.replace(/_user$|_ai$/, '');
    return audioChunkStorage.mergeSessionAudioSynchronized(
      baseSessionId,
      options
    );
  }

  /**
   * Gets session audio statistics
   * @returns Object containing audio statistics for the current session
   */
  public async getSessionAudioStats(): Promise<{
    userChunks: number;
    aiChunks: number;
    totalChunks: number;
    sessionDuration: number;
  } | null> {
    if (!this._sessionId) {
      return null;
    }

    try {
      const baseSessionId = this._sessionId.replace(/_user$|_ai$/, '');
      const userChunks = await audioChunkStorage.getAudioChunksBySession(
        `${baseSessionId}_user`
      );
      const aiChunks = await audioChunkStorage.getAudioChunksBySession(
        `${baseSessionId}_ai`
      );

      const sessionDuration = Date.now() - this._sessionStartTime;

      return {
        userChunks: userChunks.length,
        aiChunks: aiChunks.length,
        totalChunks: userChunks.length + aiChunks.length,
        sessionDuration,
      };
    } catch (error) {
      console.warn('Failed to get session audio stats:', error);
      return null;
    }
  }

  constructor(options: LiveClientOptions) {
    super();
    this.client = new GoogleGenAI(options);
    this.send = this.send.bind(this);
    this.onopen = this.onopen.bind(this);
    this.onerror = this.onerror.bind(this);
    this.onclose = this.onclose.bind(this);
    this.onmessage = this.onmessage.bind(this);
  }

  protected log(type: string, message: StreamingLog['message']) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit('log', log);
  }

  async connect(model: string, config: LiveConnectConfig): Promise<boolean> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return false;
    }

    this._status = 'connecting';
    this.config = config;
    this._model = model;
    // Generate a unique session ID for this connection
    this._sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this._audioChunkIndex = 0;
    this._sessionStartTime = Date.now();
    this._userAudioIndex = 0;
    this._aiAudioIndex = 0;

    const callbacks: LiveCallbacks = {
      onopen: this.onopen,
      onmessage: this.onmessage,
      onerror: this.onerror,
      onclose: this.onclose,
    };

    try {
      this._session = await this.client.live.connect({
        model,
        config: {
          ...config,
          outputAudioTranscription: {},
        },
        callbacks,
      });
    } catch (e) {
      console.error('Error connecting to GenAI Live:', e);
      this._status = 'disconnected';
      return false;
    }

    this._status = 'connected';
    return true;
  }

  public disconnect() {
    if (!this.session) {
      return false;
    }
    this.session?.close();
    this._session = null;
    this._status = 'disconnected';
    this._sessionId = null;
    this._audioChunkIndex = 0;
    this._sessionStartTime = 0;
    this._userAudioIndex = 0;
    this._aiAudioIndex = 0;

    this.log('client.close', `Disconnected`);
    return true;
  }

  protected onopen() {
    this.log('client.open', 'Connected');
    this.emit('open');
  }

  protected onerror(e: ErrorEvent) {
    this.log('server.error', e.message);
    this.emit('error', e);
  }

  protected onclose(e: CloseEvent) {
    this.log(
      `server.close`,
      `disconnected ${e.reason ? `with reason: ${e.reason}` : ``}`
    );
    this.emit('close', e);
  }

  protected async onmessage(message: LiveServerMessage) {
    if (message.setupComplete) {
      this.log('server.send', 'setupComplete');
      this.emit('setupcomplete');
      return;
    }
    if (message.toolCall) {
      this.log('server.toolCall', message);
      this.emit('toolcall', message.toolCall);
      return;
    }
    if (message.toolCallCancellation) {
      this.log('server.toolCallCancellation', message);
      this.emit('toolcallcancellation', message.toolCallCancellation);
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (message.serverContent) {
      const { serverContent } = message;
      if ('interrupted' in serverContent) {
        this.log('server.content', 'interrupted');
        this.emit('interrupted');
        return;
      }
      if ('turnComplete' in serverContent) {
        this.log('server.content', 'turnComplete');
        this.emit('turncomplete');
      }

      if ('modelTurn' in serverContent) {
        let parts: Part[] = serverContent.modelTurn?.parts || [];

        // when its audio that is returned for modelTurn
        const audioParts = parts.filter(
          p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/pcm')
        );
        const base64s = audioParts.map(p => p.inlineData?.data);

        // strip the audio parts out of the modelTurn
        const otherParts = difference(parts, audioParts);
        // console.log('message', JSON.stringify(message, null, 2));

        base64s.forEach(async b64 => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emit('audio', data);
            this.log(`server.audio`, `buffer (${data.byteLength})`);

            // Save AI audio chunk to storage with timing
            if (this._sessionId) {
              try {
                const relativeTime = Date.now() - this._sessionStartTime;
                const chunkId = await audioChunkStorage.addAudioChunk(
                  data,
                  `${this._sessionId}_ai`,
                  {
                    duration: undefined, // Duration not available from GenAI response
                    sampleRate: 24000, // Default sample rate for GenAI audio
                    channels: 1, // Mono audio from GenAI
                    compress: false, // Disable compression to preserve audio quality
                    relativeTime: relativeTime,
                    audioType: 'ai',
                    sequenceIndex: this._aiAudioIndex,
                  }
                );
                this._aiAudioIndex++;
                this._audioChunkIndex++;
                this.log(
                  'storage.audio',
                  `Saved AI audio chunk ${this._aiAudioIndex} at ${relativeTime}ms for session ${this._sessionId}`
                );
              } catch (error) {
                console.error('Failed to save AI audio chunk to IndexedDB:', error);
                this.log(
                  'storage.error',
                  `Failed to save AI audio chunk to IndexedDB: ${
                    error instanceof Error ? error.message : 'Unknown error'
                  }`
                );
              }
            }
          }
        });
        if (!otherParts.length) {
          return;
        }

        parts = otherParts;

        const content: { modelTurn: Content } = { modelTurn: { parts } };
        this.emit('content', content);
        this.log(`server.content`, message);
      }
    } else {
      console.log('received unmatched message', message);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      this.session?.sendRealtimeInput({ media: ch });

      // Save user audio chunks to storage
      if (ch.mimeType.includes('audio') && this._sessionId) {
        hasAudio = true;
        try {
          // Convert base64 to ArrayBuffer for storage
          const audioData = base64ToArrayBuffer(ch.data);

          // Save user audio chunk with proper labeling and timing
          const relativeTime = Date.now() - this._sessionStartTime;
          audioChunkStorage
            .addAudioChunk(
              audioData,
              `${this._sessionId}_user`, // Separate user audio with suffix
              {
                duration: undefined, // Duration not available from input
                sampleRate: 16000, // Typical input sample rate
                channels: 1, // Mono audio input
                compress: false, // Disable compression to preserve audio quality
                relativeTime: relativeTime,
                audioType: 'user',
                sequenceIndex: this._userAudioIndex,
              }
            )
            .then(() => {
              this._userAudioIndex++;
              this.log(
                'storage.user_audio',
                `Saved user audio chunk ${this._userAudioIndex} at ${relativeTime}ms for session ${this._sessionId}`
              );
            })
            .catch(error => {
              console.warn('Failed to save user audio chunk:', error);
              this.log(
                'storage.error',
                `Failed to save user audio chunk: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`
              );
            });
        } catch (error) {
          console.warn(
            'Failed to process user audio chunk for storage:',
            error
          );
        }
      }

      if (ch.mimeType.includes('image')) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? 'audio + video'
        : hasAudio
        ? 'audio'
        : hasVideo
        ? 'video'
        : 'unknown';
    this.log(`client.realtimeInput`, message);
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (
      toolResponse.functionResponses &&
      toolResponse.functionResponses.length
    ) {
      this.session?.sendToolResponse({
        functionResponses: toolResponse.functionResponses,
      });
      this.log(`client.toolResponse`, toolResponse);
    }
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    this.session?.sendClientContent({ turns: parts, turnComplete });
    this.log(`client.send`, {
      turns: Array.isArray(parts) ? parts : [parts],
      turnComplete,
    });
  }
}
