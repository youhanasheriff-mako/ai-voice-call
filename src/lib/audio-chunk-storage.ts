/**
 * Audio Chunk Storage Service
 * 
 * Manages storage and retrieval of audio chunks in local storage
 * with proper error handling and type safety.
 */

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
    }
  ): Promise<string> {
    try {
      const chunkId = this.generateUniqueId();
      const timestamp = Date.now();
      const metadata = this.getMetadata();
      const index = metadata.nextIndex;

      // Convert audio data to base64 for storage
      const uint8Array = audioData instanceof ArrayBuffer 
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
        compressedSize
      };

      // Store the chunk
      const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
      localStorage.setItem(storageKey, JSON.stringify(chunk));

      // Update metadata
      metadata.chunkIds.push(chunkId);
      metadata.nextIndex += 1;
      metadata.lastUpdated = timestamp;
      this.saveMetadata(metadata);

      return chunkId;
    } catch (error) {
      throw new Error(`Failed to add audio chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all stored audio chunks in the correct order
   * @returns Array of audio chunks sorted by index, or empty array if none exist
   * @throws Error if retrieval operation fails
   */
  public async getAudioChunks(): Promise<AudioChunk[]> {
    try {
      const metadata = this.getMetadata();
      
      if (metadata.chunkIds.length === 0) {
        return [];
      }

      const chunks: AudioChunk[] = [];
      const invalidChunkIds: string[] = [];

      for (const chunkId of metadata.chunkIds) {
        try {
          const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
          const storedData = localStorage.getItem(storageKey);
          
          if (!storedData) {
            invalidChunkIds.push(chunkId);
            continue;
          }

          const serializedChunk: SerializedAudioChunk = JSON.parse(storedData);
          const rawData = this.base64ToArrayBuffer(serializedChunk.data);
          const audioData = await this.decompressData(rawData, serializedChunk.compressed || false);

          chunks.push({
            id: serializedChunk.id,
            sessionId: serializedChunk.sessionId,
            data: audioData,
            timestamp: serializedChunk.timestamp,
            index: serializedChunk.index,
            duration: serializedChunk.duration,
            sampleRate: serializedChunk.sampleRate,
            channels: serializedChunk.channels,
            compressed: serializedChunk.compressed
          });
        } catch (error) {
          console.warn(`Failed to retrieve chunk ${chunkId}:`, error);
          invalidChunkIds.push(chunkId);
        }
      }

      // Clean up invalid chunk references
      if (invalidChunkIds.length > 0) {
        this.cleanupInvalidChunks(invalidChunkIds);
      }

      // Sort chunks by index to ensure correct playback order
      return chunks.sort((a, b) => a.index - b.index);
    } catch (error) {
      throw new Error(`Failed to retrieve audio chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clears all stored audio chunks
   * @throws Error if clear operation fails
   */
  public clearAllChunks(): void {
    try {
      const metadata = this.getMetadata();
      
      // Remove all chunk data
      for (const chunkId of metadata.chunkIds) {
        const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
        localStorage.removeItem(storageKey);
      }

      // Reset metadata
      this.saveMetadata({
        chunkIds: [],
        nextIndex: 0,
        lastUpdated: Date.now()
      });
    } catch (error) {
      throw new Error(`Failed to clear audio chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the total number of stored chunks
   * @returns Number of stored chunks
   */
  public getChunkCount(): number {
    try {
      const metadata = this.getMetadata();
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
  public async getAudioChunksBySession(sessionId: string): Promise<AudioChunk[]> {
    try {
      const allChunks = await this.getAudioChunks();
      return allChunks
        .filter(chunk => chunk.sessionId === sessionId)
        .sort((a, b) => a.index - b.index);
    } catch (error) {
      throw new Error(`Failed to retrieve chunks for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const totalDuration = chunks.reduce((sum, chunk) => sum + (chunk.duration || 0), 0);
      const sampleRate = chunks.find(c => c.sampleRate)?.sampleRate;
      const channels = chunks.find(c => c.channels)?.channels;

      return {
        sessionId,
        startTime,
        endTime,
        totalChunks: chunks.length,
        totalDuration,
        sampleRate,
        channels
      };
    } catch (error) {
      throw new Error(`Failed to get session info for ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const data = chunk.data instanceof ArrayBuffer ? new Uint8Array(chunk.data) : chunk.data;
        return sum + data.byteLength;
      }, 0);

      // Merge chunks
      const merged = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of chunks) {
        const data = chunk.data instanceof ArrayBuffer ? new Uint8Array(chunk.data) : chunk.data;
        merged.set(data, offset);
        offset += data.byteLength;
      }

      return merged;
    } catch (error) {
      throw new Error(`Failed to merge audio for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes all chunks for a specific session
   * @param sessionId - The session identifier
   * @throws Error if deletion operation fails
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const metadata = this.getMetadata();
      const chunksToDelete: string[] = [];

      // Find chunks belonging to this session
      for (const chunkId of metadata.chunkIds) {
        try {
          const storageKey = `${AudioChunkStorageService.STORAGE_KEY}_${chunkId}`;
          const storedData = localStorage.getItem(storageKey);
          if (storedData) {
            const chunk: SerializedAudioChunk = JSON.parse(storedData);
            if (chunk.sessionId === sessionId) {
              chunksToDelete.push(chunkId);
              localStorage.removeItem(storageKey);
            }
          }
        } catch (error) {
          console.warn(`Failed to check chunk ${chunkId}:`, error);
        }
      }

      // Update metadata
      metadata.chunkIds = metadata.chunkIds.filter(id => !chunksToDelete.includes(id));
      metadata.lastUpdated = Date.now();
      this.saveMetadata(metadata);
    } catch (error) {
      throw new Error(`Failed to delete session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if local storage is available and has sufficient space
   * @returns True if storage is available, false otherwise
   */
  public isStorageAvailable(): boolean {
    try {
      const testKey = 'audio_storage_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
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

  private getMetadata(): AudioChunkMetadata {
    try {
      const stored = localStorage.getItem(AudioChunkStorageService.METADATA_KEY);
      if (!stored) {
        return {
          chunkIds: [],
          nextIndex: 0,
          lastUpdated: Date.now()
        };
      }
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse metadata, resetting:', error);
      return {
        chunkIds: [],
        nextIndex: 0,
        lastUpdated: Date.now()
      };
    }
  }

  private saveMetadata(metadata: AudioChunkMetadata): void {
    localStorage.setItem(AudioChunkStorageService.METADATA_KEY, JSON.stringify(metadata));
  }

  private cleanupInvalidChunks(invalidChunkIds: string[]): void {
    try {
      const metadata = this.getMetadata();
      metadata.chunkIds = metadata.chunkIds.filter(id => !invalidChunkIds.includes(id));
      metadata.lastUpdated = Date.now();
      this.saveMetadata(metadata);
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
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
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

  private async decompressData(data: Uint8Array, compressed: boolean): Promise<Uint8Array> {
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
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
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
      while (i + count < data.length && data[i + count] === current && count < 255) {
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