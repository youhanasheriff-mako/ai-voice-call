# AI Voice Call 🎙️

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)

A sophisticated React-based web application that enables real-time voice conversations with AI using Google's Gemini Live API. This application provides a seamless interface for multimodal AI interactions, supporting voice input/output, screen sharing, and advanced conversation management.

[![Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

🎥 **[Watch the Live Demo](https://www.youtube.com/watch?v=J_q7JY1XxFE)**

## ✨ Features

- 🎤 **Real-time Voice Conversations**: Natural voice interactions with AI using WebSocket connections
- 🖥️ **Screen Sharing**: Share your screen content with the AI for enhanced context
- 📹 **Webcam Integration**: Video input support for multimodal conversations
- 🎨 **Modern UI/UX**: Clean, responsive interface built with React and SCSS
- 🔧 **Developer Tools**: Comprehensive logging and debugging capabilities
- 🌐 **WebSocket Communication**: Efficient real-time data streaming
- 📊 **Audio Visualization**: Real-time audio level monitoring
- 🎯 **Function Calling**: Support for custom function declarations and tool usage
- 🔍 **Google Search Integration**: Enhanced AI responses with web search capabilities

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- **Gemini API Key** - [Get your free API key](https://aistudio.google.com/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/youhanasheriff-mako/ai-voice-call.git
   cd ai-voice-call
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   # Gemini API Key
   # Get your free API key from: https://aistudio.google.com/apikey
   REACT_APP_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

### 🔧 Configuration

#### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_GEMINI_API_KEY` | Your Gemini API key for accessing the Live API | ✅ Yes | - |

#### Voice Options

The application supports multiple AI voice personalities:

- **Puck**: Playful and energetic
- **Charon**: Deep and authoritative  
- **Kore**: Warm and friendly
- **Fenrir**: Bold and confident
- **Aoede**: Melodic and expressive

#### Browser Permissions

For optimal functionality, grant the following permissions when prompted:

- 🎤 **Microphone access**: Required for voice input
- 📹 **Camera access**: Optional, for video conversations
- 🖥️ **Screen sharing**: Optional, for screen capture functionality

## 💡 Usage Examples

### Basic Voice Conversation

1. **Start a conversation**: Click the microphone button to begin voice input
2. **Speak naturally**: The AI will respond in real-time with voice output
3. **View logs**: Monitor the conversation flow in the developer console

### Advanced Features

#### Screen Sharing Integration
```typescript
// Enable screen sharing for enhanced AI context
const startScreenShare = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
    // Stream is now available for AI processing
  } catch (error) {
    console.error('Screen sharing failed:', error);
  }
};
```

#### Custom Function Declarations
```typescript
import { type FunctionDeclaration, SchemaType } from '@google/generative-ai';

// Define custom functions for the AI to use
export const customFunction: FunctionDeclaration = {
  name: 'process_data',
  description: 'Processes user data and returns formatted results',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      data: {
        type: SchemaType.STRING,
        description: 'Raw data to process'
      }
    },
    required: ['data']
  }
};
```

### 🎯 Use Cases

- **Virtual Assistant**: Create AI-powered voice assistants
- **Educational Tools**: Interactive learning experiences with voice feedback
- **Accessibility**: Voice-controlled applications for users with disabilities
- **Content Creation**: AI-assisted content generation with voice input
- **Customer Support**: Intelligent voice-based customer service solutions

## 🏗️ Project Structure

```
ai-voice-call/
├── public/                 # Static assets
│   ├── assets/            # Media files (avatars, videos)
│   ├── favicon.ico        # App icon
│   └── index.html         # HTML template
├── src/                   # Source code
│   ├── module/            # Core application modules
│   │   ├── audio/         # Audio processing utilities
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   └── types.ts       # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   ├── App.scss          # Global styles
│   └── index.tsx          # Application entry point
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md             # Project documentation
```

## 🔧 Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and includes:

- **Event-emitting WebSocket client** for seamless API communication
- **Audio processing layer** for real-time voice input/output
- **Modular component architecture** for easy customization
- **Comprehensive logging system** for debugging and monitoring

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Runs the app in development mode at [http://localhost:3000](http://localhost:3000) |
| `npm run start-https` | Starts the development server with HTTPS enabled |
| `npm run build` | Builds the app for production to the `build` folder |
| `npm test` | Launches the test runner in interactive watch mode |
| `npm run eject` | **Note: This is a one-way operation!** Removes Create React App abstraction |

### 🛠️ Built With

- **[React 18.3.1](https://reactjs.org/)** - Frontend framework
- **[TypeScript 5.6.3](https://www.typescriptlang.org/)** - Type safety and developer experience
- **[Google Generative AI](https://www.npmjs.com/package/@google/genai)** - Gemini API integration
- **[Zustand](https://github.com/pmndrs/zustand)** - State management
- **[SCSS](https://sass-lang.com/)** - Styling and theming
- **[Vega-Embed](https://github.com/vega/vega-embed)** - Data visualization
- **[React Icons](https://react-icons.github.io/react-icons/)** - Icon library

### 🧪 Testing

The project includes a comprehensive testing setup:

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### 📦 Building for Production

```bash
# Create optimized production build
npm run build

# The build folder will contain optimized static files
# Deploy the contents of the build folder to your hosting provider
```

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/ai-voice-call.git
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit them:
   ```bash
   git commit -m "Add your descriptive commit message"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request** on GitHub

### Contribution Guidelines

- **Code Style**: Follow the existing code style and use TypeScript
- **Testing**: Add tests for new features and ensure existing tests pass
- **Documentation**: Update documentation for any new features or changes
- **Commit Messages**: Use clear, descriptive commit messages
- **Issue First**: For major changes, please open an issue first to discuss

### Code of Conduct

This project follows [Google's Open Source Community Guidelines](https://opensource.google/conduct/). Please be respectful and inclusive in all interactions.

### Contributor License Agreement

Contributions to this project must be accompanied by a [Contributor License Agreement](https://cla.developers.google.com/about) (CLA). Visit [https://cla.developers.google.com/](https://cla.developers.google.com/) to see your current agreements or to sign a new one.

## 🐛 Issues and Support

- **Bug Reports**: [Create an issue](https://github.com/youhanasheriff-mako/ai-voice-call/issues) with detailed reproduction steps
- **Feature Requests**: [Open a discussion](https://github.com/youhanasheriff-mako/ai-voice-call/discussions) to propose new features
- **Questions**: Check existing [discussions](https://github.com/youhanasheriff-mako/ai-voice-call/discussions) or start a new one

## 📚 Resources

- **[Gemini API Documentation](https://ai.google.dev/api/multimodal-live)** - Official API documentation
- **[React Documentation](https://reactjs.org/docs)** - Learn React fundamentals
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - TypeScript guide
- **[Create React App](https://create-react-app.dev/)** - CRA documentation

## 🔒 Security

- **API Keys**: Never commit API keys to the repository
- **Environment Variables**: Use `.env.local` for sensitive configuration
- **HTTPS**: Use HTTPS in production environments
- **Permissions**: Only request necessary browser permissions

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

```
Copyright 2024 AI Voice Call Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## 🙏 Acknowledgments

- **Google Gemini Team** for the powerful Live API
- **React Community** for the excellent ecosystem
- **Open Source Contributors** who make projects like this possible

## ⚠️ Disclaimer

This is an experimental project showcasing the Gemini Live API capabilities. While we strive to maintain and support this project, please note:

- This is **not an official Google product**
- Use in production environments at your own discretion
- API usage may incur costs based on your Gemini API plan
- Respect copyright and trademark rights when using this software

For more information about Google's policies, visit [Google's Site Policies](https://developers.google.com/terms/site-policies).

---

<div align="center">
  <strong>Built with ❤️ using React and Gemini Live API</strong>
  <br>
  <sub>Star ⭐ this repository if you find it helpful!</sub>
</div>
