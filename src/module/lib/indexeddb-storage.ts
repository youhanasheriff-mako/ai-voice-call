/**
 * IndexedDB wrapper service that provides localStorage-like interface
 * with much larger storage capacity for audio chunks
 */

export interface IDBStorageOptions {
  dbName?: string;
  version?: number;
  storeName?: string;
}

export class IndexedDBStorage {
  private dbName: string;
  private version: number;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(options: IDBStorageOptions = {}) {
    this.dbName = options.dbName || 'AudioChunkDB';
    this.version = options.version || 1;
    this.storeName = options.storeName || 'chunks';
  }

  /**
   * Initialize the IndexedDB database
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Store an item in IndexedDB
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const item = {
        key,
        value,
        timestamp: Date.now()
      };

      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to store item: ${request.error?.message}`));
    });
  }

  /**
   * Retrieve an item from IndexedDB
   */
  async getItem(key: string): Promise<string | null> {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      
      request.onerror = () => reject(new Error(`Failed to get item: ${request.error?.message}`));
    });
  }

  /**
   * Remove an item from IndexedDB
   */
  async removeItem(key: string): Promise<void> {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to remove item: ${request.error?.message}`));
    });
  }

  /**
   * Clear all items from IndexedDB
   */
  async clear(): Promise<void> {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear store: ${request.error?.message}`));
    });
  }

  /**
   * Get all keys from IndexedDB
   */
  async getAllKeys(): Promise<string[]> {
    await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      
      request.onerror = () => reject(new Error(`Failed to get keys: ${request.error?.message}`));
    });
  }

  /**
   * Get keys that match a prefix
   */
  async getKeysWithPrefix(prefix: string): Promise<string[]> {
    const allKeys = await this.getAllKeys();
    return allKeys.filter(key => key.startsWith(prefix));
  }

  /**
   * Remove items that match a prefix
   */
  async removeItemsWithPrefix(prefix: string): Promise<void> {
    const keys = await this.getKeysWithPrefix(prefix);
    const promises = keys.map(key => this.removeItem(key));
    await Promise.all(promises);
  }

  /**
   * Check if IndexedDB is available
   */
  static isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Get storage usage estimate (if supported)
   */
  async getStorageEstimate(): Promise<{ usage?: number; quota?: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate();
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }
    return null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Create a default instance for audio chunk storage
export const audioIndexedDBStorage = new IndexedDBStorage({
  dbName: 'AudioChunkDB',
  version: 1,
  storeName: 'audio_chunks'
});