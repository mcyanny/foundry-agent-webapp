import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication, EventType, type AuthenticationResult } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { msalConfig } from "./config/authConfig";
import "./index.css";
import { AppProvider, MockAppProvider } from './contexts/AppContext';
import { ThemeProvider } from './components/ThemeProvider';
import { initTelemetry } from './services/telemetry';
import { MockApp } from './mock/MockApp';

initTelemetry();

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

// Initialize MSAL instance.
// In mock mode the instance uses placeholder credentials and is only present
// to satisfy the useMsal() hook requirements — no real token requests are made.
const msalInstance = new PublicClientApplication(msalConfig);

// Handle redirect promise (required for PKCE flow)
msalInstance.initialize().then(() => {
  if (!MOCK_MODE) {
    // Account selection logic (optional, handles multiple accounts)
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }

    msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult;
        const account = payload.account;
        msalInstance.setActiveAccount(account);
      }
    });
  }

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error('Failed to find the root element');
    return;
  }

  if (MOCK_MODE) {
    // Mock mode: skip real auth flow, use MockAppProvider + MockApp
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <MockAppProvider>
            <ThemeProvider>
              <MockApp />
            </ThemeProvider>
          </MockAppProvider>
        </MsalProvider>
      </React.StrictMode>
    );
  } else {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <AppProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </AppProvider>
        </MsalProvider>
      </React.StrictMode>
    );
  }
});
