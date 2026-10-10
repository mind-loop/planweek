import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { DataProvider } from './context/DataContext';
import { DistrictProvider } from './context/DistrictContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <DistrictProvider>
          <App />
        </DistrictProvider>
      </DataProvider>
    </ToastProvider>
  </StrictMode>,
);
