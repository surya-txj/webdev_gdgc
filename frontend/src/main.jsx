import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Shared';
import App from './App';
// Fonts are bundled with the app (no external font CDN needed).
// Cinzel = headlines and the logo name, Tenor Sans = subtitles and body text.
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/tenor-sans/400.css';
import '@fontsource/caveat/500.css';
import './styles/theme.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></BrowserRouter></React.StrictMode>);
