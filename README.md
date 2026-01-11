# Paper2Video 🎬

> Transform academic papers into engaging video abstracts - Powered by Gemini & Veo

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
paper-video/
├── src/
│   ├── app/
│   │   ├── globals.css      # Global styles & Tailwind config
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main page (state machine driven)
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   ├── FileDropzone.tsx # File upload zone
│   │   ├── StyleSelector.tsx # Style selector
│   │   ├── ActionBar.tsx    # Generate button & chain of thought
│   │   └── ResultPreview.tsx # Video preview & download
│   └── lib/
│       ├── types.ts         # TypeScript type definitions
│       ├── store.ts         # Zustand state management
│       └── utils.ts         # Utility functions
```

## 🎨 UI Design

### State Machine Flow

```
State 1: Landing (Initial)
    └── Only shows upload zone
    
State 2: Configuration (Active)
    └── Expands style selector and script preview after upload
    
State 3: Generating (Processing)
    └── Shows chain of thought progress
    
State 4: Result (Final)
    └── Displays video and storyboards
```

### Style Options

| Style | Description | Best For |
|-------|-------------|----------|
| Nature Cinematic | Realistic 3D rendering, dark backgrounds | Medical/Biology |
| Blueprint Industrial | Blueprint style, line art | Engineering/Physics |
| Trendy Motion | Bright colors, high contrast, dynamic | SciComm/Education |
| Custom | AI-generated custom styles | Any creative vision |

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: Shadcn UI + Tailwind CSS v4
- **Animation**: Framer Motion
- **State Management**: Zustand
- **Fonts**: Outfit (main) + Fira Code (mono)

## 📝 Development TODO

### API Integration

1. **Gemini API Integration** (`src/lib/api/gemini.ts`)
   - PDF parsing and content extraction
   - Paper summarization
   - Script writing

2. **Veo API Integration** (`src/lib/api/veo.ts`)
   - Video rendering
   - Segment composition

3. **ImageFX API Integration** (`src/lib/api/imagefx.ts`)
   - Storyboard generation
   - Static previews

### Feature Extensions

- [ ] Real PDF parsing (pdf.js or Gemini)
- [ ] Script editor (user refinement)
- [ ] Video style previews (thumbnails)
- [ ] Multi-language voiceover support
- [ ] Video duration customization
- [ ] Share functionality implementation
- [ ] History saving

### UI Enhancements

- [ ] Paper source text highlighting
- [ ] Video timeline seeking
- [ ] Keyboard shortcuts
- [ ] Mobile optimization

## 🎯 API Integration Example

### Gemini API Call

```typescript
// src/lib/api/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzePaper(pdfFile: File) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const result = await model.generateContent([
    'Analyze this academic paper, extract title, abstract and key points...',
    // PDF content
  ]);
  
  return result.response.text();
}

export async function generateScript(paperContent: string, style: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const result = await model.generateContent([
    `Based on the following paper content, generate a ${style} style video script...`,
    paperContent,
  ]);
  
  return result.response.text();
}
```

### Environment Variables

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_gemini_api_key
VEO_API_KEY=your_veo_api_key
IMAGEFX_API_KEY=your_imagefx_api_key
```

## 📄 License

MIT
