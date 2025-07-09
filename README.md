# 🏋️‍♂️ Jeffy AI - Your Intelligent Fitness Voice Diary

<div align="center">

![Jeffy AI Logo](public/logo.png)

**Transform your workout tracking with AI-powered voice recognition and intelligent exercise management**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.50.3-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)

</div>

---

<div align="center">

## 🚀 **Try Jeffy AI Now - It's Free and still in prototyping phase!**

**[🌐 Visit Website](https://jeffy-ai.netlify.app)** • **[👨‍💻 Creator Portfolio](https://orijeet100.github.io/orijeet_portfolio/)**

*Experience the future of workout tracking with AI-powered voice recognition*

</div>

---

## ✨ Features

### 🎤 **Voice-Powered Workout Logging**
- **Real-time Voice Transcription**: Speak your workouts naturally using Deepgram's advanced speech recognition
- **Live Transcription Display**: See your words appear as you speak near the microphone button
- **Smart Auto-Stop**: Recording automatically stops after 3 minutes or 20 seconds of silence
- **AI-Powered Parsing**: OpenAI extracts exercise details, weights, and reps from your voice input
- **Instant Set Creation**: Convert spoken workouts into structured exercise sets automatically

### 📊 **Intelligent Dashboard**
- **Date-Based Workout Viewing**: Browse your fitness journey by selecting any date
- **Muscle Group Organization**: Sets are automatically grouped by muscle groups in logical order
- **Real-time Editing**: Modify weights, reps, and exercise details on the fly
- **Bulk Operations**: Edit multiple sets simultaneously for efficient workout management
- **Visual Progress Tracking**: Clean, intuitive interface for reviewing your fitness data

### 🧠 **Exercise Knowledge Management**
- **Personalized Exercise Database**: Customize your exercise library with your preferred movements
- **Muscle Group Categorization**: Organize exercises by body parts for better tracking
- **Default Exercise Library**: Pre-loaded with 70+ common exercises across 7 muscle groups
- **Easy Add/Remove**: Seamlessly add new exercises or remove ones you don't use
- **Consistent Ordering**: Muscle groups display in the same order across the app

### 🔐 **Secure Authentication**
- **Email & Google OAuth**: Multiple sign-in options for your convenience
- **Guest Mode**: Try the app without creating an account
- **Secure Data Storage**: All workout data stored in private Supabase database
- **Privacy-First**: Voice recordings are processed securely and never stored

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Beautiful Gradients**: Purple-to-blue gradient theme with glassmorphism effects
- **Smooth Animations**: Delightful micro-interactions and transitions
- **Dark/Light Mode Ready**: Built with theming support
- **Accessible**: WCAG compliant components and keyboard navigation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or bun
- Supabase account
- Deepgram API key
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jeffy-ai.git
   cd jeffy-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up Supabase Database**
   Run the following SQL in your Supabase SQL editor:
   ```sql
   -- Create workouts table
   CREATE TABLE workouts (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     date DATE NOT NULL,
     data JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create exercise_knowledge table
   CREATE TABLE exercise_knowledge (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
     data JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE exercise_knowledge ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view own workouts" ON workouts
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own workouts" ON workouts
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update own workouts" ON workouts
     FOR UPDATE USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete own workouts" ON workouts
     FOR DELETE USING (auth.uid() = user_id);

   CREATE POLICY "Users can view own exercise knowledge" ON exercise_knowledge
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own exercise knowledge" ON exercise_knowledge
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update own exercise knowledge" ON exercise_knowledge
     FOR UPDATE USING (auth.uid() = user_id);
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development experience
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible component library
- **React Router** - Client-side routing
- **React Hook Form** - Performant forms with validation
- **TanStack Query** - Powerful data fetching and caching

### Backend & Services
- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **Deepgram** - Advanced speech-to-text API for voice transcription
- **OpenAI GPT** - AI-powered workout parsing and natural language processing

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## 📱 How to Use

### 1. **Getting Started**
- Sign up with your email or Google account
- Or try the app in guest mode without creating an account

### 2. **Voice Workout Logging**
- Click the "Add Set" button on the dashboard
- Press the microphone button and start speaking
- Say something like: *"I did 3 sets of bench press, 185 pounds, 8 reps each"*
- The AI will automatically extract exercise details and create your sets
- Review and save your workout data

### 3. **Manual Workout Entry**
- Use the manual form to add individual sets
- Select muscle group and exercise from your knowledge base
- Enter weight and reps
- Save to your workout log

### 4. **Managing Your Exercise Library**
- Navigate to "Exercise Knowledge" in the sidebar
- Add new muscle groups or exercises
- Customize your personal exercise database
- Organize exercises by body parts

### 5. **Reviewing Your Progress**
- Use the date picker to view workouts from any day
- Edit sets directly from the dashboard
- Group and organize your workout data by muscle groups
- Track your fitness journey over time

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `VITE_DEEPGRAM_API_KEY` | Deepgram API key for voice transcription | Yes |
| `VITE_OPENAI_API_KEY` | OpenAI API key for workout parsing | Yes |

### API Keys Setup

1. **Supabase**: Create a new project at [supabase.com](https://supabase.com)
2. **Deepgram**: Sign up at [deepgram.com](https://deepgram.com) and get your API key
3. **OpenAI**: Get your API key from [platform.openai.com](https://platform.openai.com)

---

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

### Vercel
1. Import your repository to Vercel
2. Configure environment variables
3. Deploy with automatic CI/CD

### Manual Build
```bash
npm run build
# Serve the dist folder with your preferred web server
```

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Creator

**Orijeet Mukherjee** - AI/ML Engineer

- [LinkedIn](https://www.linkedin.com/in/orijeet-mukherjee/)
- [GitHub](https://github.com/orijeet100)
- [Portfolio](https://orijeet100.github.io/orijeet_portfolio/)

---

## 🙏 Acknowledgments

- [Shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Supabase](https://supabase.com/) for the powerful backend platform
- [Deepgram](https://deepgram.com/) for advanced speech recognition
- [OpenAI](https://openai.com/) for intelligent natural language processing
- [Vite](https://vitejs.dev/) for the lightning-fast build tool

---

<div align="center">

**Made with ❤️ by Orijeet Mukherjee**

[Live Demo](https://jeffy-ai.netlify.app) • [Report Bug](https://github.com/yourusername/jeffy-ai/issues) • [Request Feature](https://github.com/yourusername/jeffy-ai/issues)

</div>
