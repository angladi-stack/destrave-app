import React from 'react';
import ReactDOM from 'react-dom/client';
import { DestraveApp } from './DestraveApp';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DestraveApp />
  </React.StrictMode>
);
export default DestraveApp;
