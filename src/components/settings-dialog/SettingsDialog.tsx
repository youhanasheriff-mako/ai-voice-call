import {
  ChangeEvent,
  FormEventHandler,
  useCallback,
  useMemo,
  useState,
} from 'react';
import './settings-dialog.scss';
import { useLiveAPIContext } from '../../module/contexts/LiveAPIContext';
import VoiceSelector from './VoiceSelector';
import { LiveConnectConfig } from '@google/genai';

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { config, setConfig, connected } = useLiveAPIContext();

  // system instructions can come in many types
  const systemInstruction = useMemo(() => {
    if (!config.systemInstruction) {
      return '';
    }
    if (typeof config.systemInstruction === 'string') {
      return config.systemInstruction;
    }
    if (Array.isArray(config.systemInstruction)) {
      return config.systemInstruction
        .map(p => (typeof p === 'string' ? p : p.text))
        .join('\n');
    }
    if (
      typeof config.systemInstruction === 'object' &&
      'parts' in config.systemInstruction
    ) {
      return config.systemInstruction.parts?.map(p => p.text).join('\n') || '';
    }
    return '';
  }, [config]);

  const updateConfig: FormEventHandler<HTMLTextAreaElement> = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newConfig: LiveConnectConfig = {
        ...config,
        systemInstruction: event.target.value,
      };
      setConfig(newConfig);
    },
    [config, setConfig]
  );

  return (
    <div className="settings-dialog">
      <button
        className="action-button material-symbols-outlined"
        onClick={() => setOpen(!open)}
      >
        settings
      </button>
      <dialog className="dialog" style={{ display: open ? 'block' : 'none' }}>
        <div className={`dialog-container ${connected ? 'disabled' : ''}`}>
          {connected && (
            <div className="connected-indicator">
              <p>
                These settings can only be applied before connecting and will
                override other settings.
              </p>
            </div>
          )}

          <VoiceSelector />

          <h3>System Instructions</h3>
          <textarea
            className="system"
            onChange={updateConfig}
            value={systemInstruction}
          />
        </div>
      </dialog>
    </div>
  );
}
