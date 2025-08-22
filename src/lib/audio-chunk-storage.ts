/**
 * Audio Chunk Storage Service
 * 
 * Manages storage and retrieval of audio chunks in local storage
 * with proper error handling and type safety.
 */

export interface AudioChunk {
  id: string;
  data: ArrayBuffer | Uint8Array;
  timestamp: number;
  index: number;
}

export interface SerializedAudioChunk {
  id: string;
  data: string; // Base64 encoded
  timestamp: number;
  index: number;
}

export class AudioChunkStorageService {
  private static readonly STORAGE_KEY = 'audio_chunks';
  private static readonly METADATA_KEY = 'audio_chunks_metadata';

  /**
   * Adds an audio chunk to local storage
   * @param audioData - The audio data as ArrayBuffer or Uint8Array
   * @returns The unique identifier for the stored chunk
   * @throws Error if storage operation fails
   */
  public addAudioChunk(audioData: ArrayBuffer | Uint8Array): string {
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

      const chunk: SerializedAudioChunk = {
        id: chunkId,
        data: base64Data,
        timestamp,
        index
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
  public getAudioChunks(): AudioChunk[] {
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
          const audioData = this.base64ToArrayBuffer(serializedChunk.data);

          chunks.push({
            id: serializedChunk.id,
            data: audioData,
            timestamp: serializedChunk.timestamp,
            index: serializedChunk.index
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
}

interface AudioChunkMetadata {
  chunkIds: string[];
  nextIndex: number;
  lastUpdated: number;
}

// Export a singleton instance for convenience
export const audioChunkStorage = new AudioChunkStorageService();