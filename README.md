# 🚀 CodeRun

> A modern browser-based online code editor with multi-language execution support powered by React, Vite, Express, and Judge0.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite)

---

# ✨ Features

- ⚡ Fast React + Vite frontend
- 🧠 Multi-language code execution
- ▶️ Run code instantly with keyboard shortcuts
- 📝 STDIN input support
- 🌙 Dark / Light mode
- 🔤 Adjustable editor font size
- 📤 Export code as files
- ⏱ Execution timer & exit status
- 🔌 Local execution for Python & JavaScript
- ☁️ Judge0 API fallback for compiled languages

---

# 📸 Preview

```txt
Write code → Run → View Output instantly
```

---

# 🛠 Supported Languages

| Language | Support Type |
|----------|---------------|
| Python | Local + Judge0 |
| JavaScript | Local + Judge0 |
| TypeScript | Judge0 |
| Java | Judge0 |
| C | Judge0 |
| C++ | Judge0 |

---

# 📂 Project Structure

```bash
CodeRun/
│
├── api/
│   └── execute.js          # Serverless execution handler
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── App.jsx             # Main editor UI
│   ├── App.css
│   ├── main.jsx
│   └── index.css
│
├── server.js               # Express backend
├── vite.config.js
├── package.json
└── index.html
```

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/coderun.git
cd coderun
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Start Development Server

```bash
npm run dev
```

### Running Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:3002 |

---

# 🧪 API Endpoints

## POST `/api/execute`

Execute source code.

### Request Body

```json
{
  "language_id": 71,
  "source_code": "print('Hello World')",
  "stdin": ""
}
```

### Response

```json
{
  "run": {
    "stdout": "Hello World\n",
    "stderr": "",
    "code": 0
  }
}
```

---

## GET `/api/health`

Check backend status.

---

## GET `/api/test`

Verify execution environment.

---

# 🧠 How Execution Works

```text
Browser
   │
   ▼
POST /api/execute
   │
   ▼
Express Backend
   │
   ├── Python / JS
   │      └── Executed locally using spawn()
   │
   └── Other Languages
          └── Forwarded to Judge0 API
```

---

# 🔒 Security Warning

⚠️ Local execution is NOT sandboxed.

User code executed locally can access system resources.

## Recommended Production Setup

- Docker container isolation
- Disable networking
- Memory & CPU limits
- Read-only filesystem
- Remove local execution entirely

---

# 🚀 Production Build

```bash
npm run build
```

Generated files:

```bash
dist/
```

Deploy easily on:

- Vercel
- Netlify
- Render
- Railway

---

# 🧰 Tech Stack

| Category | Technology |
|----------|-------------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Execution | Judge0 + Local Spawn |
| Styling | CSS |
| Font | JetBrains Mono |

---

# 📌 Known Limitations

- No syntax highlighting
- No persistent storage
- Judge0 public API rate limits
- No authentication system
- Local execution unsafe for production

---

# 🔮 Future Improvements

- Monaco Editor integration
- Syntax highlighting
- File system support
- User authentication
- Saved snippets/projects
- Docker sandbox execution
- Real-time collaboration
- Custom themes

---

# 🤝 Contributing

Contributions are welcome.

```bash
fork → clone → code → commit → pull request
```

---

# 📄 License

MIT License

---

# 👨‍💻 Author

Built with ❤️ using React + Node.js
