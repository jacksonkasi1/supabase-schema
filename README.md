<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/jacksonkasi1/tiger-sql">
    <img src="src/assets/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h1 align="center">Tiger SQL</h1>

  <p align="center">
    <strong>PostgreSQL Schema Visualizer & Designer with AI-Powered Assistance</strong>
    <br />
    Secure • Simple • Smart
    <br />
    <br />
    <a href="https://tiger-sql.vercel.app/"><strong>View Demo »</strong></a>
    <br />
    <br />
    <a href="https://github.com/jacksonkasi1/tiger-sql/issues">Report Bug</a>
    ·
    <a href="https://github.com/jacksonkasi1/tiger-sql/issues">Request Feature</a>
    ·
    <a href="https://github.com/jacksonkasi1/tiger-sql/discussions">Discussions</a>
  </p>

  <p align="center">
    <a href="https://github.com/jacksonkasi1/tiger-sql/stargazers">
      <img src="https://img.shields.io/github/stars/jacksonkasi1/tiger-sql?style=social" alt="Stars">
    </a>
    <a href="https://github.com/jacksonkasi1/tiger-sql/network/members">
      <img src="https://img.shields.io/github/forks/jacksonkasi1/tiger-sql?style=social" alt="Forks">
    </a>
    <a href="https://github.com/jacksonkasi1/tiger-sql/blob/main/LICENSE.txt">
      <img src="https://img.shields.io/github/license/jacksonkasi1/tiger-sql" alt="License">
    </a>
  </p>
</div>

![Tiger SQL](images/main.png)

## 🎯 Overview

**Tiger SQL** is a powerful, modern PostgreSQL schema visualizer and designer that combines intuitive visual design with AI-powered assistance. Built with Next.js 15 and React 19, it offers a seamless experience for designing, visualizing, and managing database schemas without requiring any installations or sensitive credentials.

## ✨ Features

### 🎨 **Visual Schema Designer**
- 🖱️ **Drag & Drop Interface** - Create and connect tables effortlessly
- 🔄 **Undo/Redo Support** - Full history management with keyboard shortcuts (Cmd/Ctrl+Z)
- 🎯 **Smart Auto-Layout** - Automatic table arrangement using Dagre algorithm
- 🌈 **Random Table Colors** - Beautiful, randomized color schemes for tables
- 📸 **Export to Image** - Save your schema as PNG
- 🔍 **Zoom & Pan** - Smooth navigation with minimap support

### 🤖 **AI-Powered Assistant**
- 💬 **Interactive Chat** - AI assistant to help with schema design
- 🧠 **Smart Suggestions** - Get recommendations for table structures and relationships
- 📝 **Context-Aware** - Understands your current schema state
- 🚀 **Powered by Multiple LLMs** - Support for OpenAI and Google AI

### 🔐 **Connection Modes**

Create relationships between tables by dragging from one column to another. Choose between two validation modes:

#### 🔓 **Flexible Mode** (Unlock Icon)
- Connect **any column to any column** without type restrictions
- Perfect for quick prototyping and sketching
- Ideal for custom types or extensions
- Maximum flexibility in schema design

#### 🔐 **Strict Mode** (Lock Icon)
- Only allows connections between **type-compatible columns**
- Validates PostgreSQL data type compatibility
- Prevents invalid relationships
- Production-ready schema design

##### Type Compatibility Groups

| Category | Compatible Types |
|----------|------------------|
| **UUID** | `uuid` |
| **Integer** | `integer`, `int`, `int2`, `int4`, `int8`, `smallint`, `bigint`, `serial`, `smallserial`, `bigserial` |
| **Numeric** | `numeric`, `decimal` |
| **Float** | `real`, `float4`, `double precision`, `float8` |
| **String** | `text`, `varchar`, `char`, `character`, `character varying` |
| **Boolean** | `boolean`, `bool` |
| **Date** | `date` |
| **Time** | `time`, `timetz` |
| **Timestamp** | `timestamp`, `timestamptz` |
| **JSON** | `json`, `jsonb` |
| **Binary** | `bytea` |

### 💾 **Data Management**
- 📦 **Import SQL** - Load existing schemas from SQL files
- 💿 **Export SQL** - Generate SQL DDL for your schema
- 🔄 **LocalStorage Persistence** - Your work is automatically saved
- 🚪 **No Login Required** - Start designing immediately

### 🛡️ **Security & Privacy**
- 🔒 **Client-Side Only** - All processing happens in your browser
- 👀 **No Sensitive Data** - Only uses public API keys
- 🔐 **No Database Passwords** - Secure by design
- 🚫 **No Server Storage** - Your data stays on your device

### 🎮 **User Experience**
- ⚡ **Lightning Fast** - Built with modern React and Next.js
- 🎨 **Beautiful UI** - Powered by Tailwind CSS and shadcn/ui
- 📱 **Responsive Design** - Works on all screen sizes
- ⌨️ **Keyboard Shortcuts** - Power-user friendly
- 🌙 **Dark Mode Support** - Easy on the eyes

## 🚀 Getting Started

### Online (Recommended)

Simply visit [Tiger SQL](https://tiger-sql.vercel.app/) and start designing your schema immediately!

### With Supabase

1. Go to [Supabase Dashboard](https://app.supabase.io/)
2. Select your Project
3. Navigate to `Settings` → `API`
4. Copy your `URL` and `anon/public` key
5. Paste them into Tiger SQL
6. Click "Fetch Schema"
7. Start visualizing! 🎉

### Import Existing Schema

1. Click "Import SQL" button
2. Paste your SQL DDL or drag & drop a `.sql` file
3. Watch your schema come to life!

## 🛠️ Built With

Tiger SQL is built with modern, cutting-edge technologies:

- **[Next.js 15](https://nextjs.org/)** - React framework for production
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety and better DX
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible components
- **[XYFlow/React Flow](https://reactflow.dev/)** - Powerful flow diagram library
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[AI SDK](https://sdk.vercel.ai/)** - AI integration by Vercel
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

## 💻 Local Development

### Prerequisites

- **[Bun](https://bun.sh/)** runtime (v1.0+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jacksonkasi1/tiger-sql.git
   cd tiger-sql
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables** (Optional - for AI features)
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys:
   ```env
   OPENAI_API_KEY=your_openai_key_here
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_here
   ```

4. **Run the development server**
   ```bash
   bun dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun start` - Start production server
- `bun run lint` - Run ESLint
- `bun run typecheck` - Run TypeScript type checking
- `bun run analyze` - Analyze bundle size
- `bun run test:memory` - Run memory leak tests

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**!

### How to Contribute

1. **Fork the Project**
2. **Create your Feature Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your Changes**
   ```bash
   git commit -m 'feat: Add some AmazingFeature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🗺️ Roadmap

- [ ] Multi-schema support
- [ ] Collaborative editing
- [ ] Schema versioning
- [ ] More export formats (JSON, YAML)
- [ ] Database connection for live schema sync
- [ ] Template library
- [ ] Advanced AI features (query generation, optimization)

See the [open issues](https://github.com/jacksonkasi1/tiger-sql/issues) for a full list of proposed features and known issues.

## 📊 Performance

Tiger SQL is optimized for performance with:

- ⚡ Virtual scrolling for large schemas
- 🧠 Efficient state management with Zustand
- 🔄 Optimized re-renders with React 19
- 💾 Smart caching strategies
- 📦 Code splitting and lazy loading
- 🎯 Memory leak prevention (tested with MemLab)

## 🙏 Acknowledgements

Special thanks to:

- [Supabase](https://supabase.io/) - For the inspiration and type generation approach
- [React Flow](https://reactflow.dev/) - Excellent flow diagram library
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [Vercel](https://vercel.com/) - Hosting and deployment
- All contributors who have helped improve Tiger SQL

## 💖 Support the Project

If you find Tiger SQL helpful, consider supporting its development:

<div align="center">
  <a href="https://github.com/sponsors/jacksonkasi1">
    <img src="https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-pink?style=for-the-badge&logo=github" alt="GitHub Sponsors">
  </a>
</div>

<br />

<div align="center">
  <a href="https://github.com/sponsors/jacksonkasi1">
    <img src="https://github.com/sponsors/jacksonkasi1/card" title="Sponsor jacksonkasi1" height="225" width="600" style="border: 0;">
  </a>
</div>

Your support helps maintain and improve Tiger SQL for everyone! ⭐

## 📜 License

Distributed under the MIT License. See [`LICENSE.txt`](LICENSE.txt) for more information.

**Not associated with Supabase.**

## 📧 Contact

**Jackson Kasi** - [@jacksonkasi0](https://twitter.com/jacksonkasi0)

**Project Link:** [https://github.com/jacksonkasi1/tiger-sql](https://github.com/jacksonkasi1/tiger-sql)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/jacksonkasi1">Jackson Kasi</a></p>
  <p>
    <a href="https://github.com/jacksonkasi1/tiger-sql/stargazers">⭐ Star this repo</a>
    if you find it useful!
  </p>
</div>