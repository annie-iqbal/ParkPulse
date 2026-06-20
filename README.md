# ParkPulse

## Run Locally

```zsh
npm install
npm run dev
```

## Share With A Public URL

Use this when you want a temporary public URL like `https://example.ngrok-free.dev` for testing on a phone.

Terminal 1:

```zsh
npm run dev:host
```

Terminal 2:

```zsh
npx ngrok http 5173
```

Copy the `https://*.ngrok-free.dev` URL from ngrok and open it on your phone. Keep both terminals running while testing.

## Preview The Production Build

```zsh
npm run build
npm run preview:host
npx ngrok http 4173
```
