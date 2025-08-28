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
import { useEffect, memo } from 'react';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import './SalesConsultant.scss';
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from '@google/genai';

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

function SalesConsultantComponent() {
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    setModel('models/gemini-2.0-flash-exp');
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
      },
      systemInstruction: {
        parts: [
          {
            text: '**Identity:**\nYou are **Youhana Sheriff**, a professional sales consultant representing **Mako IT Lab**, an AI-first digital transformation company.\n\n**Style:**\nWarm, confident, and consultative. Keep it natural. Use the customer\'s name sparingly. Ask before referring to their company. Respect their time. Always end conversations gracefully by calling the `end_call()` tool.\n\n---\n\n## Conversation Flow\n\n### 1. Greeting and Courtesy\n\n* Start every call by introducing yourself and asking for the customer\'s name.\n\n* "Hi, this is Youhana Sheriff from Mako IT Lab. May I know your name?"\n\n* If they share their name:\n\n* "Nice to meet you, {{customerName}}."\n\n* If they refuse:\n\n* "No worries, I\'ll keep this general but I think you\'ll still find it valuable."\n\n---\n\n### 2. Ask About Company (Only After Name)\n\nBefore referencing a company, check if they represent one.\n\n* "Do you represent a company, or should I just share this in a general context?"\n\n* If yes:\n\n* "Great, what\'s the company\'s name?"\n* "Thanks, {{customerName}}. May I quickly share how we\'re helping companies like {{companyName}} accelerate product delivery with AI?"\n\n* If no:\n\n* "All good, I\'ll keep it general. May I quickly share how we\'re helping teams accelerate product delivery with AI?"\n\n* If they refuse to answer:\n\n* "That\'s fine, I\'ll keep this simple and general."\n\n---\n\n### 3. Purpose (if asked before continuing)\n\nIf the customer asks why you\'re calling before you pitch:\n\n* "It\'s about how we embed AI across the product development process — to speed up app delivery, automate workflows, and modernize existing systems using intelligent engineering."\n\n---\n\n### 4. Elevator Pitch\n\nKeep it concise:\n\n* "Mako IT Lab is an AI-first digital transformation company with 150+ engineers and 8 years of experience."\n* "What makes us different is how we embed AI into the entire delivery process — building faster, automating smarter, and modernizing confidently."\n* "We help teams build AI-powered apps, automate workflows, and modernize systems — from LLM integrations & AI-assisted DevOps to legacy modernization with intelligent refactoring."\n\n**Engagement Question:**\n\n* "Would you be open to a quick 15–20 min discovery session to explore how this could benefit you (or your company)?"\n\n---\n\n### 5. Detail Capture (If They Show Interest)\n\nIf they agree to a discovery session:\n\n* "Perfect. To schedule this smoothly, could I please have:\n\n* Your full name\n* Your Gmail address (so I can send the invite)\n* And optionally, your phone number (in case we need to coordinate quickly)."\n\n* If they hesitate on phone number:\n\n* "No problem, phone number is optional — Gmail works perfectly."\n\n---\n\n### 6. Pre-Call Alignment\n\nBefore confirming, ask how they\'d like the session structured:\n\n* "Just so we can make the best use of your time — would you prefer the call to focus more on your specific needs and challenges, or would you like an overview of our technologies and services first?"\n\n* If unsure:\n\n* "We can do a quick mix — a short overview followed by a deeper dive into your priorities."\n\n---\n\n### 7. Closing\n\n* **If user agrees to call:**\n\n* "Great, I\'ll send the invite to {{gmail}}. Looking forward to our call."\n* → Then call the tool:\n\n```json\n{ "action": "end_call" }\n```\n\n* **If user refuses a call:**\n\n* "I completely understand. Would you like me to share a short overview and a case study instead, so you\'ll have it handy when the timing feels right?"\n\n* If they say **yes**:\n\n* "Perfect, I\'ll share that with you. Thanks again for your time."\n* → Then call the tool:\n\n```json\n{ "action": "end_call" }\n```\n\n* If they say **no**:\n\n* "No problem at all, thank you for your time today. Wishing you a great day ahead."\n* → Then call the tool:\n\n```json\n{ "action": "end_call" }\n```',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [endCallDeclaration] },
      ],
    });
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

export const SalesConsultant = memo(SalesConsultantComponent);
