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
  GoogleGenAIOptions,
  LiveClientToolResponse,
  LiveServerMessage,
  Part,
} from "@google/genai";

/**
 * the options to initiate the client, ensure apiKey is required
 */
export type LiveClientOptions = GoogleGenAIOptions & { apiKey: string };

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message:
    | string
    | ClientContentLog
    | Omit<LiveServerMessage, "text" | "data">
    | LiveClientToolResponse;
};

export type ClientContentLog = {
  turns: Part[];
  turnComplete: boolean;
};

/** Plugin-specific types */
export interface AIVoiceCallPluginProps {
  /** Gemini API key for authentication */
  apiKey: string;
  /** Custom configuration options */
  options?: Partial<LiveClientOptions>;
  /** Custom styling classes */
  className?: string;
  /** Position of the floating button */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom theme configuration */
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  /** Callback when plugin opens */
  onOpen?: () => void;
  /** Callback when plugin closes */
  onClose?: () => void;
  /** Callback when call starts */
  onCallStart?: () => void;
  /** Callback when call ends */
  onCallEnd?: () => void;
}

export interface PluginState {
  isOpen: boolean;
  isMinimized: boolean;
  isConnected: boolean;
  isLoading: boolean;
}