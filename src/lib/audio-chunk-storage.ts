/**
 * Audio Chunk Storage Service
 *
 * Manages storage and retrieval of audio chunks in local storage
 * with proper error handling and type safety.
 */

import { audioIndexedDBStorage } from './indexeddb-storage';

export interface AudioChunk {
  id: string;
  sessionId: string;
  data: ArrayBuffer | Uint8Array;
  timestamp: number;
  index: number;
  duration?: number; // in milliseconds
  sampleRate?: number;
  channels?: number;
  compressed?: boolean;
  relativeTime?: number; // Time relative to session start in milliseconds
  audioType?: 'user' | 'ai'; // Type of audio source
  sequenceIndex?: number; // Sequential index within audio type
}

export interface SerializedAudioChunk {
  id: string;
  sessionId: string;
  data: string; // Base64 encoded (potentially compressed)
  timestamp: number;
  index: number;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  compressed?: boolean;
  originalSize?: number;
  compressedSize?: number;
  relativeTime?: number; // Time relative to session start in milliseconds
  audioType?: 'user' | 'ai'; // Type of audio source
  sequenceIndex?: number; // Sequential index within audio type
}

export interface AudioSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalChunks: number;
  totalDuration: number;
  sampleRate?: number;
  channels?: number;
}

export class AudioChunkStorageService {
  private static readonly STORAGE_KEY = 'audio_chunks';
  private static readonly METADATA_KEY = 'audio_chunks_metadata';
  private storage = audioIndexedDBStorage;

  /**
   * Adds an audio chunk to local storage
   * @param audioData - The audio data as ArrayBuffer or Uint8Array
   * @param sessionId - The session identifier for grouping chunks
   * @param options - Optional metadata for the chunk
   * @returns The unique identifier for the stored chunk
   * @throws Error if storage operation fails
   */
  public async addAudioChunk(
    audioData: ArrayBuffer | Uint8Array,
    sessionId: string,
    options?: {
      duration?: number;
      sampleRate?: number;
      channels?: number;
      compress?: boolean;
      relativeTime?: number;
      audioType?: 'user' | 'ai';
      sequenceIndex?: number;
    }
  ): Promise<string> {
    try {
      const chunkId = this.generateUniqueId();
      const timestamp = Date.now();
      const metadata = await this.getMetadata();
      const index = metadata.nextIndex;

      // Convert audio data to base64 for storage
      const uint8Array =
        audioData instanceof ArrayBuffer
          ? new Uint8Array(audioData)
          : audioData;
      const base64Data = this.arrayBufferToBase64(uint8Array);

      const originalSize = uint8Array.byteLength;
      let finalData = base64Data;
      let compressed = false;
      let compressedSize = originalSize;

      // Apply compression if requested and beneficial
      if (options?.compress && originalSize > 1024) {
        try {
          const compressedData = await this.compressData(uint8Array);
          const compressedBase64 = this.arrayBufferToBase64(compressedData);
          if (compressedBase64.length < base64Data.length) {
            finalData = compressedBase64;
            compressed = true;
            compressedSize = compressedData.byteLength;
          }
        } catch (error) {
          console.warn('Compression failed, using uncompressed data:', error);
        }
      }

      const chunk: SerializedAudioChunk = {
        id: chunkId,
        sessionId,
        data: finalData,
        timestamp,
        index,
        duration: options?.duration,
        sampleRate: options?.sampleRate,
        channels: options?.channels,
        compressed,
        originalSize,
        compressedSize,
        relativeTime: options?.relativeTime,
        audioType: options?.audioType,
        sequenceIndex: options?.sequenceIndex,
      };

      // Store the chunk
      const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
      await this.storage.setItem(storageKey, JSON.stringify(chunk));

      // Update metadata
      metadata.chunkIds.push(chunkId);
      metadata.nextIndex += 1;
      metadata.lastUpdated = timestamp;
      await this.saveMetadata(metadata);

      return chunkId;
    } catch (error) {
      throw new Error(
        `Failed to add audio chunk: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Retrieves all stored audio chunks in the correct order
   * @returns Array of audio chunks sorted by index, or empty array if none exist
   * @throws Error if retrieval operation fails
   */
  public async getAudioChunks(): Promise<AudioChunk[]> {
    try {
      const metadata = await this.getMetadata();

      if (metadata.chunkIds.length === 0) {
        return [];
      }

      const chunks: AudioChunk[] = [];
      const invalidChunkIds: string[] = [];

      for (const chunkId of metadata.chunkIds) {
        try {
          const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
          const storedData = await this.storage.getItem(storageKey);

          if (!storedData) {
            invalidChunkIds.push(chunkId);
            continue;
          }

          const serializedChunk: SerializedAudioChunk = JSON.parse(storedData);
          const rawData = this.base64ToArrayBuffer(serializedChunk.data);
          const audioData = await this.decompressData(
            rawData,
            serializedChunk.compressed || false
          );

          chunks.push({
            id: serializedChunk.id,
            sessionId: serializedChunk.sessionId,
            data: audioData,
            timestamp: serializedChunk.timestamp,
            index: serializedChunk.index,
            duration: serializedChunk.duration,
            sampleRate: serializedChunk.sampleRate,
            channels: serializedChunk.channels,
            compressed: serializedChunk.compressed,
            relativeTime: serializedChunk.relativeTime,
            audioType: serializedChunk.audioType,
            sequenceIndex: serializedChunk.sequenceIndex,
          });
        } catch (error) {
          console.warn(`Failed to retrieve chunk ${chunkId}:`, error);
          invalidChunkIds.push(chunkId);
        }
      }

      // Clean up invalid chunk references
      if (invalidChunkIds.length > 0) {
        await this.cleanupInvalidChunks(invalidChunkIds);
      }

      // Sort chunks by index to ensure correct playback order
      return chunks.sort((a, b) => a.index - b.index);
    } catch (error) {
      throw new Error(
        `Failed to retrieve audio chunks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Clears all stored audio chunks
   * @throws Error if clear operation fails
   */
  public async clearAllChunks(): Promise<void> {
    try {
      const metadata = await this.getMetadata();

      // Remove all chunk data
      for (const chunkId of metadata.chunkIds) {
        const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
        await this.storage.removeItem(storageKey);
      }

      // Reset metadata
      await this.saveMetadata({
        chunkIds: [],
        nextIndex: 0,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      throw new Error(
        `Failed to clear audio chunks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Gets the total number of stored chunks
   * @returns Number of stored chunks
   */
  public async getChunkCount(): Promise<number> {
    try {
      const metadata = await this.getMetadata();
      return metadata.chunkIds.length;
    } catch (error) {
      console.warn('Failed to get chunk count:', error);
      return 0;
    }
  }

  /**
   * Retrieves audio chunks for a specific session ID
   * @param sessionId - The session identifier
   * @returns Array of audio chunks for the session, sorted by index
   * @throws Error if retrieval operation fails
   */
  public async getAudioChunksBySession(
    sessionId: string
  ): Promise<AudioChunk[]> {
    try {
      const allChunks = await this.getAudioChunks();
      return allChunks
        .filter(chunk => chunk.sessionId === sessionId)
        .sort((a, b) => a.index - b.index);
    } catch (error) {
      throw new Error(
        `Failed to retrieve chunks for session ${sessionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Gets all available session IDs
   * @returns Array of unique session IDs
   */
  public async getSessionIds(): Promise<string[]> {
    try {
      const allChunks = await this.getAudioChunks();
      const sessionIds = new Set(allChunks.map(chunk => chunk.sessionId));
      return Array.from(sessionIds);
    } catch (error) {
      console.warn('Failed to get session IDs:', error);
      return [];
    }
  }

  /**
   * Gets session information including metadata
   * @param sessionId - The session identifier
   * @returns Session information or null if not found
   */
  public async getSessionInfo(sessionId: string): Promise<AudioSession | null> {
    try {
      const chunks = await this.getAudioChunksBySession(sessionId);
      if (chunks.length === 0) {
        return null;
      }

      const startTime = Math.min(...chunks.map(c => c.timestamp));
      const endTime = Math.max(...chunks.map(c => c.timestamp));
      const totalDuration = chunks.reduce(
        (sum, chunk) => sum + (chunk.duration || 0),
        0
      );
      const sampleRate = chunks.find(c => c.sampleRate)?.sampleRate;
      const channels = chunks.find(c => c.channels)?.channels;

      return {
        sessionId,
        startTime,
        endTime,
        totalChunks: chunks.length,
        totalDuration,
        sampleRate,
        channels,
      };
    } catch (error) {
      throw new Error(
        `Failed to get session info for ${sessionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Merges audio chunks from a session into a single audio buffer
   * @param sessionId - The session identifier
   * @returns Merged audio data as Uint8Array
   * @throws Error if merge operation fails
   */
  public async mergeSessionAudio(sessionId: string): Promise<Uint8Array> {
    try {
      const chunks = await this.getAudioChunksBySession(sessionId);
      if (chunks.length === 0) {
        return new Uint8Array(0);
      }

      // Calculate total size
      const totalSize = chunks.reduce((sum, chunk) => {
        const data =
          chunk.data instanceof ArrayBuffer
            ? new Uint8Array(chunk.data)
            : chunk.data;
        return sum + data.byteLength;
      }, 0);

      // Merge chunks
      const merged = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of chunks) {
        const data =
          chunk.data instanceof ArrayBuffer
            ? new Uint8Array(chunk.data)
            : chunk.data;
        merged.set(data, offset);
        offset += data.byteLength;
      }

      return merged;
    } catch (error) {
      throw new Error(
        `Failed to merge audio for session ${sessionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Merges audio chunks from both user and AI for a session chronologically
   * @param baseSessionId - The base session identifier (without _user or _ai suffix)
   * @param options - Configuration for merging behavior
   * @returns Merged audio data with proper timing alignment
   */
  public async mergeSessionAudioSynchronized(
    baseSessionId: string,
    options?: {
      sampleRate?: number;
      channels?: number;
      silenceThreshold?: number; // milliseconds of silence to insert between segments
      maxGapFill?: number; // maximum gap in milliseconds to fill with silence
    }
  ): Promise<Uint8Array> {
    try {
      console.log(
        `[AudioChunkStorage] Starting audio merge for session: ${baseSessionId}`
      );

      const defaultOptions = {
        sampleRate: 16000,
        channels: 1,
        silenceThreshold: 100,
        maxGapFill: 2000,
        ...options,
      };

      console.log(`[AudioChunkStorage] Merge options:`, defaultOptions);

      // Get both user and AI chunks
      const userChunks = await this.getAudioChunksBySession(
        `${baseSessionId}_user`
      );
      const aiChunks = await this.getAudioChunksBySession(
        `${baseSessionId}_ai`
      );

      console.log(
        `[AudioChunkStorage] Found ${userChunks.length} user chunks and ${aiChunks.length} AI chunks`
      );

      // Combine and sort by relative time
      const allChunks = [...userChunks, ...aiChunks]
        .filter(chunk => chunk.relativeTime !== undefined)
        .sort((a, b) => (a.relativeTime || 0) - (b.relativeTime || 0));

      console.log(
        `[AudioChunkStorage] Total chunks with timing: ${allChunks.length}`
      );

      if (allChunks.length === 0) {
        console.log(
          `[AudioChunkStorage] No chunks with timing found, returning empty array`
        );
        return new Uint8Array(0);
      }

      const mergedSegments: Uint8Array[] = [];
      let lastEndTime = 0;
      let silenceSegmentsAdded = 0;

      console.log(
        `[AudioChunkStorage] Processing ${allChunks.length} chunks for merging`
      );

      for (const chunk of allChunks) {
        const chunkStartTime = chunk.relativeTime || 0;
        const data =
          chunk.data instanceof ArrayBuffer
            ? new Uint8Array(chunk.data)
            : chunk.data;

        // Calculate gap between last chunk and current chunk
        const gap = chunkStartTime - lastEndTime;

        // Insert silence if gap is significant but not too large
        if (
          gap > defaultOptions.silenceThreshold &&
          gap <= defaultOptions.maxGapFill
        ) {
          const silenceDuration = Math.min(gap, defaultOptions.maxGapFill);
          const silenceSamples = Math.floor(
            (silenceDuration / 1000) *
              defaultOptions.sampleRate *
              defaultOptions.channels
          );
          const silenceData = new Uint8Array(silenceSamples * 2); // 16-bit samples
          mergedSegments.push(silenceData);
          silenceSegmentsAdded++;
          console.log(
            `[AudioChunkStorage] Added ${silenceDuration}ms silence gap (${silenceData.byteLength} bytes)`
          );
        }

        // Add the audio chunk
        mergedSegments.push(data);

        // Estimate chunk duration (rough approximation)
        const estimatedDuration =
          chunk.duration ||
          (data.byteLength /
            (defaultOptions.sampleRate * defaultOptions.channels * 2)) *
            1000;
        lastEndTime = chunkStartTime + estimatedDuration;
      }

      // Calculate total size and merge
      const totalSize = mergedSegments.reduce(
        (sum, segment) => sum + segment.byteLength,
        0
      );

      console.log(
        `[AudioChunkStorage] Merging ${mergedSegments.length} segments (${silenceSegmentsAdded} silence segments) into ${totalSize} bytes`
      );

      const merged = new Uint8Array(totalSize);
      let offset = 0;

      for (const segment of mergedSegments) {
        merged.set(segment, offset);
        offset += segment.byteLength;
      }

      console.log(
        `[AudioChunkStorage] Successfully merged audio for session ${baseSessionId}: ${merged.byteLength} bytes`
      );
      return merged;
    } catch (error) {
      console.error(
        `[AudioChunkStorage] Error merging audio for session ${baseSessionId}:`,
        error
      );
      throw new Error(
        `Failed to merge synchronized audio for session ${baseSessionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Saves merged audio as a single chunk with the base session ID
   * @param baseSessionId - The base session identifier (without _user or _ai suffix)
   * @param mergedAudio - The merged audio data
   * @param options - Additional options for the saved audio
   * @returns The ID of the saved merged audio chunk
   */
  public async saveMergedAudio(
    baseSessionId: string,
    mergedAudio: Uint8Array,
    options?: {
      sampleRate?: number;
      channels?: number;
      compress?: boolean;
    }
  ): Promise<string> {
    try {
      const mergedSessionId = `${baseSessionId}_merged`;
      const defaultOptions = {
        sampleRate: 16000,
        channels: 1,
        compress: true,
        ...options,
      };

      // Calculate estimated duration
      const estimatedDuration =
        (mergedAudio.byteLength /
          (defaultOptions.sampleRate * defaultOptions.channels * 2)) *
        1000;

      // Save the merged audio as a single chunk
      const chunkId = await this.addAudioChunk(mergedAudio, mergedSessionId, {
        duration: estimatedDuration,
        sampleRate: defaultOptions.sampleRate,
        channels: defaultOptions.channels,
        compress: defaultOptions.compress,
        relativeTime: 0,
        audioType: 'ai', // Mark as 'ai' type for consistency
        sequenceIndex: 0,
      });

      return chunkId;
    } catch (error) {
      throw new Error(
        `Failed to save merged audio for session ${baseSessionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Checks if a session has been merged
   * @param baseSessionId - The base session identifier
   * @returns True if merged audio exists for this session
   */
  public async isMergedAudioAvailable(baseSessionId: string): Promise<boolean> {
    try {
      const mergedSessionId = `${baseSessionId}_merged`;
      const chunks = await this.getAudioChunksBySession(mergedSessionId);
      return chunks.length > 0;
    } catch (error) {
      console.warn(
        `Failed to check merged audio availability for session ${baseSessionId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Deletes all chunks for a specific session
   * @param sessionId - The session identifier
   * @throws Error if deletion operation fails
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      const chunksToDelete: string[] = [];

      // Find chunks belonging to this session
      for (const chunkId of metadata.chunkIds) {
        try {
          const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
          const storedData = await this.storage.getItem(storageKey);
          if (storedData) {
            const chunk: SerializedAudioChunk = JSON.parse(storedData);
            if (chunk.sessionId === sessionId) {
              chunksToDelete.push(chunkId);
              await this.storage.removeItem(storageKey);
            }
          }
        } catch (error) {
          console.warn(`Failed to check chunk ${chunkId}:`, error);
        }
      }

      // Update metadata
      metadata.chunkIds = metadata.chunkIds.filter(
        id => !chunksToDelete.includes(id)
      );
      metadata.lastUpdated = Date.now();
      await this.saveMetadata(metadata);
    } catch (error) {
      throw new Error(
        `Failed to delete session ${sessionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Checks if IndexedDB storage is available and has sufficient space
   * @returns Promise that resolves to true if storage is available, false otherwise
   */
  public async isStorageAvailable(): Promise<boolean> {
    try {
      const testKey = 'test_storage_availability';
      await this.storage.setItem(testKey, 'test');
      await this.storage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('Storage not available:', error);
      return false;
    }
  }

  // Private helper methods

  private generateUniqueId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async getMetadata(): Promise<AudioChunkMetadata> {
    try {
      const stored = await this.storage.getItem(
        AudioChunkStorageService.METADATA_KEY
      );
      if (!stored) {
        return {
          chunkIds: [],
          nextIndex: 0,
          lastUpdated: Date.now(),
        };
      }
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse metadata, resetting:', error);
      return {
        chunkIds: [],
        nextIndex: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  private async saveMetadata(metadata: AudioChunkMetadata): Promise<void> {
    await this.storage.setItem(
      AudioChunkStorageService.METADATA_KEY,
      JSON.stringify(metadata)
    );
  }

  private async cleanupInvalidChunks(invalidChunkIds: string[]): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      metadata.chunkIds = metadata.chunkIds.filter(
        (id: string) => !invalidChunkIds.includes(id)
      );
      metadata.lastUpdated = Date.now();
      await this.saveMetadata(metadata);
    } catch (error) {
      console.warn('Failed to cleanup invalid chunks:', error);
    }
  }

  private async compressData(data: Uint8Array): Promise<Uint8Array> {
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(data.slice());
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }

        // Combine chunks
        const totalLength = chunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return result;
      } catch (error) {
        console.warn('Native compression failed:', error);
      }
    }

    // Fallback: simple RLE compression for repetitive data
    return this.simpleCompress(data);
  }

  private async decompressData(
    data: Uint8Array,
    compressed: boolean
  ): Promise<Uint8Array> {
    if (!compressed) {
      return data;
    }

    // Use DecompressionStream if available
    if ('DecompressionStream' in window) {
      try {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(data.slice());
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }

        // Combine chunks
        const totalLength = chunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return result;
      } catch (error) {
        console.warn('Native decompression failed:', error);
      }
    }

    // Fallback: simple RLE decompression
    return this.simpleDecompress(data);
  }

  private simpleCompress(data: Uint8Array): Uint8Array {
    // Simple run-length encoding for repetitive audio data
    const compressed: number[] = [];
    let i = 0;

    while (i < data.length) {
      const current = data[i];
      let count = 1;

      // Count consecutive identical bytes (max 255)
      while (
        i + count < data.length &&
        data[i + count] === current &&
        count < 255
      ) {
        count++;
      }

      if (count > 3) {
        // Use RLE for runs of 4 or more
        compressed.push(255, count, current); // 255 is escape byte
      } else {
        // Store individual bytes
        for (let j = 0; j < count; j++) {
          compressed.push(current);
        }
      }

      i += count;
    }

    return new Uint8Array(compressed);
  }

  private simpleDecompress(data: Uint8Array): Uint8Array {
    const decompressed: number[] = [];
    let i = 0;

    while (i < data.length) {
      if (data[i] === 255 && i + 2 < data.length) {
        // RLE sequence
        const count = data[i + 1];
        const value = data[i + 2];
        for (let j = 0; j < count; j++) {
          decompressed.push(value);
        }
        i += 3;
      } else {
        // Regular byte
        decompressed.push(data[i]);
        i++;
      }
    }

    return new Uint8Array(decompressed);
  }
}

interface AudioChunkMetadata {
  chunkIds: string[];
  nextIndex: number;
  lastUpdated: number;
}

// Export a singleton instance for convenience
export const audioChunkStorage = new AudioChunkStorageService();
