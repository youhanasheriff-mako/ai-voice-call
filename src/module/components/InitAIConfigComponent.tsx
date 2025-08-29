import { useEffect, memo } from 'react';
import './SalesConsultant.scss';
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from '@google/genai';
import { systemPrompt } from '../constants';
import { useLiveCall } from '../contexts/LiveCallContext';

export const endCallDeclaration: FunctionDeclaration = {
  name: 'end_call',
  description:
    'Ends the current call conversation when the conversation concludes naturally.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'The action to perform, should always be "end_call"',
      },
    },
    required: ['action'],
  },
};

function InitAIConfigComponent() {
  const { client, setConfig, setModel } = useLiveCall();

  useEffect(() => {
    console.log('🔧 InitAIConfig: Setting up AI configuration...');
    setModel('models/gemini-2.0-flash-exp');
    console.log('✅ Model set to: models/gemini-2.0-flash-exp');

    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
      },
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [endCallDeclaration] },
      ],
    };

    console.log('🔧 Setting config:', config);
    setConfig(config);
    console.log('✅ InitAIConfig: Configuration setup completed');
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }

      // Handle end_call tool
      const endCallFc = toolCall.functionCalls.find(
        fc => fc.name === endCallDeclaration.name
      );
      if (endCallFc) {
        // Send successful response first
        client.sendToolResponse({
          functionResponses: [
            {
              response: {
                output: { success: true, message: 'Call ended successfully' },
              },
              id: endCallFc.id,
              name: endCallFc.name,
            },
          ],
        });

        // Disconnect the client after a short delay to allow the response to be sent
        setTimeout(() => {
          client.disconnect();
        }, 500);
        return;
      }

      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls?.map(fc => ({
                response: { output: { success: true } },
                id: fc.id,
                name: fc.name,
              })),
            }),
          200
        );
      }
    };
    client.on('toolcall', onToolCall);
    return () => {
      client.off('toolcall', onToolCall);
    };
  }, [client]);

  return <div className="sales-consultant-interface" />;
}

export const InitAIConfig = memo(InitAIConfigComponent);
