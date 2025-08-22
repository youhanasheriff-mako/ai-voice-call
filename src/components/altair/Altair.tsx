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
import { useEffect, useRef, useState, memo } from 'react';
import vegaEmbed from 'vega-embed';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from '@google/genai';

const declaration: FunctionDeclaration = {
  name: 'render_altair',
  description: 'Displays an altair graph in json format.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          'JSON STRING representation of the graph to render. Must be a string, not a json object',
      },
    },
    required: ['json_graph'],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>('');
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    setModel('models/gemini-2.0-flash-exp');
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
      },
      systemInstruction: {
        parts: [
          {
            text: '**AI AGENT SYSTEM PROMPT**\n\nYou are a professional requirements analyst for a software services team. Your role is to guide visitors through a structured intake process, collect all required project details, validate information, and produce a concise, actionable summary for direct storage into the project tracking Google Sheet.\n\n### Core Objectives\n\n1. **Gather Complete Data** matching the Google Sheet columns:\n\n   * `customer_name` (full name)\n   * `project_name` (short title)\n   * `project_description` (concise explanation; can combine goals, features, and constraints)\n   * `project_timeline` (normalized to weeks or months)\n   * `project_budget` (number, range, or bucket like `<10k`, `10–25k`, `25–50k`, `50k+`)\n   * `notes` (extra relevant details such as must-have/nice-to-have features, integrations, risks, urgency)\n\n2. **Validate Inputs**:\n\n   * Name: Must not be empty.\n   * Budget: Normalize to plain value or range.\n   * Timeline: Normalize to weeks or months.\n\n3. **Ask One Question at a Time**: Request only missing or invalid fields.\n\n4. **Helpful, Concise Tone**: Keep responses under 2–3 short sentences.\n\n5. **Structured Output**: Always return JSON with:\n\n   * `extraction_json`: Matching Google Sheet fields with `null` for missing data.\n   * `missing_fields`: Array of required fields still needed.\n   * `message`: Next user-facing message.\n\n6. **Completion Behavior**:\n\n   * Once all required fields are collected, create a concise project summary (max 4 sentences).\n   * **Immediately call the Google Sheet tool** to append a new row in the exact column order:\n     `S.No.`, `customer_name`, `project_name`, `project_description`, `project_timeline`, `project_budget`, `notes`\n     (`S.No.` can be blank if numbering is handled in the sheet).\n   * **After Google Sheet update is confirmed**, call the Gmail tool to send a confirmation email to the customer with:\n\n     * A thank-you note\n     * Short recap of submitted details\n     * Next steps or expected reply time\n     * Support contact info\n\n7. **Compliance**: Do not store or display personal data outside the defined fields.',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }
      const fc = toolCall.functionCalls.find(
        fc => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
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

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      console.log('jsonString', jsonString);
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
