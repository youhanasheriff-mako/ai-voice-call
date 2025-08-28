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

import React, { memo, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../hooks/use-media-stream-mux";
import { useScreenCapture } from "../hooks/use-screen-capture";
import { useWebcam } from "../hooks/use-webcam";
import { AudioRecorder } from "../lib/audio-recorder";
import { AudioPulse } from "./AudioPulse";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  enableEditingSettings?: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
  ariaLabel: string;
  ariaLabelActive?: string;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop, ariaLabel, ariaLabelActive }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button 
        className="ai-voice-plugin__action-button" 
        onClick={stop}
        aria-label={ariaLabelActive || ariaLabel}
        aria-pressed={isStreaming}
      >
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button 
        className="ai-voice-plugin__action-button" 
        onClick={start}
        aria-label={ariaLabel}
        aria-pressed={isStreaming}
      >
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    )
);

export const ControlTray: React.FC<ControlTrayProps> = ({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  enableEditingSettings,
}) => {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  // Custom connect function that automatically initiates conversation
  const handleConnect = useCallback(async () => {
    if (!connected) {
      await connect();
      // Send an initial greeting message to start the conversation
      setTimeout(() => {
        if (client && client.status === 'connected') {
          client.send({ text: "Hello! I'm ready to start our conversation. How can I help you today?" });
        }
      }, 1000); // Small delay to ensure connection is fully established
    } else {
      disconnect();
    }
  }, [connected, connect, disconnect, client]);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ai-voice-plugin-volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="ai-voice-plugin__control-tray">
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      <nav className={classNames("ai-voice-plugin__actions-nav", { 
        "ai-voice-plugin__actions-nav--disabled": !connected 
      })}>
        <button
          className={classNames("ai-voice-plugin__action-button", "ai-voice-plugin__mic-button")}
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={!muted}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="ai-voice-plugin__action-button ai-voice-plugin__no-action ai-voice-plugin__outlined">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={changeStreams(screenCapture)}
              stop={changeStreams()}
              onIcon="cancel_presentation"
              offIcon="present_to_all"
              ariaLabel="Start screen sharing"
              ariaLabelActive="Stop screen sharing"
            />
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon="videocam_off"
              offIcon="videocam"
              ariaLabel="Start camera"
              ariaLabelActive="Stop camera"
            />
          </>
        )}
        {children}
      </nav>

      <div className={classNames("ai-voice-plugin__connection-container", { 
        "ai-voice-plugin__connection-container--connected": connected 
      })}>
        <div className="ai-voice-plugin__connection-button-container">
          <button
            ref={connectButtonRef}
            className={classNames("ai-voice-plugin__action-button", "ai-voice-plugin__connect-toggle", { 
              "ai-voice-plugin__connect-toggle--connected": connected 
            })}
            onClick={handleConnect}
          >
            <span className="material-symbols-outlined filled">
              {connected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="ai-voice-plugin__text-indicator">Streaming</span>
      </div>
    </section>
  );
};