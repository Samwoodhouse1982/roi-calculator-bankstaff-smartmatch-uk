import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted DM Sans (variable font, bundled by Vite) so the kiosk never
// depends on Google's CDN at the venue. Registers as 'DM Sans Variable'.
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/dm-sans/wght-italic.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
