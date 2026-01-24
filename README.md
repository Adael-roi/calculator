# Scientific Calculator (Vanilla JS, PWA-ready)

Basic starter scaffold for a beginner-friendly scientific calculator using plain HTML, CSS, and JavaScript with high-precision support and offline capability (PWA).

Quick start

1. Install dependencies:

```bash
npm install --save mathjs decimal.js
npm install --save-dev vite vitest http-server
```

2. Run dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
npm run preview
```

Notes
- The calculator evaluation runs inside a Web Worker at `src/worker/calculatorWorker.js`.
- Configure decimal precision in `src/math/decimalConfig.js`.
- Install icons under `public/icons/` for the manifest.
