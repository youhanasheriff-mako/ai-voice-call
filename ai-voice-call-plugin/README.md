# AI Voice Call React Plugin

A comprehensive React plugin for integrating AI-powered voice calling functionality into your applications. Built with Google's Gemini Live API, this plugin provides a floating voice call interface with real-time audio streaming, screen sharing, and webcam support.

## Features

- 🎤 **Real-time Voice Interaction**: Seamless voice communication with AI using Google's Gemini Live API
- 📱 **Responsive Design**: Mobile-friendly floating button and overlay interface
- 🎥 **Screen Sharing**: Built-in screen capture and sharing capabilities
- 📹 **Webcam Support**: Video streaming integration
- ♿ **Accessibility**: Full keyboard navigation and ARIA support
- 🎨 **Customizable**: Configurable themes, positioning, and styling
- 📦 **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @ai-voice-call/react-plugin
```

## Quick Start

```tsx
import React from 'react';
import { AIVoiceCallPlugin } from '@ai-voice-call/react-plugin';

function App() {
  return (
    <div className="App">
      {/* Your app content */}
      
      <AIVoiceCallPlugin
        apiKey="your-gemini-api-key"
        position="bottom-right"
        theme="light"
        onOpen={() => console.log('Plugin opened')}
        onClose={() => console.log('Plugin closed')}
        onCallStart={() => console.log('Call started')}
        onCallEnd={() => console.log('Call ended')}
      />
    </div>
  );
}

export default App;
```

## API Reference

### AIVoiceCallPlugin Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | **Required** | Your Google Gemini API key |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | Position of the floating button |
| `theme` | `'light' \| 'dark'` | `'light'` | Visual theme of the plugin |
| `onOpen` | `() => void` | `undefined` | Callback when plugin overlay opens |
| `onClose` | `() => void` | `undefined` | Callback when plugin overlay closes |
| `onCallStart` | `() => void` | `undefined` | Callback when voice call starts |
| `onCallEnd` | `() => void` | `undefined` | Callback when voice call ends |
| `className` | `string` | `undefined` | Additional CSS class for the plugin container |
| `disabled` | `boolean` | `false` | Disable the plugin functionality |

### Hooks

The plugin exports several useful hooks for advanced integration:

#### `useScreenCapture()`

```tsx
import { useScreenCapture } from '@ai-voice-call/react-plugin';

function MyComponent() {
  const { stream, isCapturing, startCapture, stopCapture } = useScreenCapture();
  
  return (
    <button onClick={isCapturing ? stopCapture : startCapture}>
      {isCapturing ? 'Stop' : 'Start'} Screen Share
    </button>
  );
}
```

#### `useWebcam()`

```tsx
import { useWebcam } from '@ai-voice-call/react-plugin';

function MyComponent() {
  const { stream, isActive, start, stop } = useWebcam();
  
  return (
    <button onClick={isActive ? stop : start}>
      {isActive ? 'Stop' : 'Start'} Camera
    </button>
  );
}
```

#### `useAudioRecorder()`

```tsx
import { useAudioRecorder } from '@ai-voice-call/react-plugin';

function MyComponent() {
  const { isRecording, startRecording, stopRecording, audioLevel } = useAudioRecorder();
  
  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'} Recording
      </button>
      <div>Audio Level: {audioLevel}</div>
    </div>
  );
}
```

### Components

You can also use individual components for custom implementations:

#### `ControlTray`

```tsx
import { ControlTray } from '@ai-voice-call/react-plugin';

<ControlTray
  videoStream={videoStream}
  onVideoStreamChange={setVideoStream}
  supportsInsertionMode={true}
/>
```

#### `AvatarVideo`

```tsx
import { AvatarVideo } from '@ai-voice-call/react-plugin';

<AvatarVideo
  videoRef={videoRef}
  stream={videoStream}
  speaking={isSpeaking}
/>
```

## Styling

The plugin comes with default styles, but you can customize the appearance:

```scss
// Override default styles
.ai-voice-call-plugin {
  --primary-color: #your-color;
  --background-color: #your-bg-color;
  --text-color: #your-text-color;
}

// Custom floating button
.ai-voice-call-plugin__button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border-radius: 50%;
}

// Custom overlay
.ai-voice-call-plugin__overlay {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
}
```

## Advanced Configuration

### Custom LiveAPI Options

```tsx
import { AIVoiceCallPlugin, LiveClientOptions } from '@ai-voice-call/react-plugin';

const customOptions: LiveClientOptions = {
  model: 'models/gemini-2.0-flash-exp',
  generationConfig: {
    responseModalities: ['audio'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Aoede'
        }
      }
    }
  }
};

<AIVoiceCallPlugin
  apiKey="your-api-key"
  liveClientOptions={customOptions}
/>
```

### Event Handling

```tsx
function App() {
  const handleCallStart = () => {
    // Analytics tracking
    analytics.track('voice_call_started');
    
    // UI updates
    setIsCallActive(true);
  };
  
  const handleCallEnd = () => {
    // Cleanup
    setIsCallActive(false);
    
    // Save call data
    saveCallHistory();
  };
  
  return (
    <AIVoiceCallPlugin
      apiKey="your-api-key"
      onCallStart={handleCallStart}
      onCallEnd={handleCallEnd}
    />
  );
}
```

## Accessibility

The plugin is built with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support with tab navigation
- **Screen Readers**: Comprehensive ARIA labels and descriptions
- **Focus Management**: Proper focus trapping and restoration
- **High Contrast**: Support for high contrast themes

### Keyboard Shortcuts

- `Tab` / `Shift+Tab`: Navigate between controls
- `Enter` / `Space`: Activate buttons
- `Escape`: Close overlay

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

**Note**: Screen sharing requires HTTPS in production environments.

## Requirements

- React 16.8+ (hooks support)
- Google Gemini API key
- Modern browser with WebRTC support

## Getting Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a new project or select existing one
3. Generate an API key for Gemini
4. Add the key to your environment variables

```bash
# .env.local
REACT_APP_GEMINI_API_KEY=your_api_key_here
```

## Examples

Check out the `/examples` directory for complete implementation examples:

- Basic integration
- Custom styling
- Advanced configuration
- TypeScript usage

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- 📧 Email: support@ai-voice-call.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/ai-voice-call-plugin/issues)
- 📖 Docs: [Documentation Site](https://docs.ai-voice-call.com)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.