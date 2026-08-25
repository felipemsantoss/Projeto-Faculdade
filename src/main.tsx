import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installDebugConsole } from './lib/debug';

installDebugConsole();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
