import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import type { ReactNode, Dispatch } from 'react';
import { useMsal } from '@azure/msal-react';
import type { AccountInfo } from '@azure/msal-browser';
import type { AppState, AppAction } from '../types/appState';
import { initialAppState } from '../types/appState';
import { appReducer } from '../reducers/appReducer';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Lightweight dev logger prevents accidental prod noise
const devLogger = {
  enabled: import.meta.env.DEV,
  group(label: string) { if (this.enabled) console.group(label); },
  log: function (...args: unknown[]) { if (this.enabled) console.log(...args); },
  end() { if (this.enabled) console.groupEnd(); }
};

// Dev mode logging middleware (diff-based)
const logStateChange = (action: AppAction, prevState: AppState, nextState: AppState) => {
  if (!devLogger.enabled) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  devLogger.group(`🔄 [${timestamp}] ${action.type}`);
  devLogger.log('Action:', action);
  const changes: Record<string, unknown> = {};
  
  // Track all meaningful state changes
  if (prevState.auth.status !== nextState.auth.status) {
    changes['auth.status'] = `${prevState.auth.status} → ${nextState.auth.status}`;
  }
  if (prevState.chat.status !== nextState.chat.status) {
    changes['chat.status'] = `${prevState.chat.status} → ${nextState.chat.status}`;
  }
  if (prevState.chat.messages.length !== nextState.chat.messages.length) {
    changes['chat.messages.length'] = `${prevState.chat.messages.length} → ${nextState.chat.messages.length}`;
  }
  if (prevState.chat.streamingMessageId !== nextState.chat.streamingMessageId) {
    changes['chat.streamingMessageId'] = `${prevState.chat.streamingMessageId} → ${nextState.chat.streamingMessageId}`;
  }
  if (prevState.ui.chatInputEnabled !== nextState.ui.chatInputEnabled) {
    changes['ui.chatInputEnabled'] = `${prevState.ui.chatInputEnabled} → ${nextState.ui.chatInputEnabled}`;
  }
  if (prevState.conversations.sidebarOpen !== nextState.conversations.sidebarOpen) {
    changes['conversations.sidebarOpen'] = `${prevState.conversations.sidebarOpen} → ${nextState.conversations.sidebarOpen}`;
  }
  if (prevState.conversations.list.length !== nextState.conversations.list.length) {
    changes['conversations.list.length'] = `${prevState.conversations.list.length} → ${nextState.conversations.list.length}`;
  }
  
  if (Object.keys(changes).length) {
    devLogger.log('Changes:', changes);
  } else {
    devLogger.log('(No state changes)');
  }
  devLogger.end();
};

/**
 * Enhanced reducer with logging middleware
 */
const reducerWithLogging = (state: AppState, action: AppAction): AppState => {
  const nextState = appReducer(state, action);
  logStateChange(action, state, nextState);
  return nextState;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducerWithLogging, initialAppState);
  const { accounts } = useMsal();

  // Initialize auth state from MSAL
  useEffect(() => {
    if (accounts.length > 0) {
      dispatch({ type: 'AUTH_INITIALIZED', user: accounts[0] });
    }
  }, [accounts]);

  // Dev mode: Log when provider mounts and unmounts
  useEffect(() => {
    devLogger.log('🚀 AppProvider initialized');
    return () => {
      devLogger.log('🔌 AppProvider unmounted');
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

const MOCK_USER: AccountInfo = {
  homeAccountId: 'mock-user',
  localAccountId: 'mock-user',
  environment: 'mock',
  tenantId: '00000000-0000-0000-0000-000000000002',
  username: 'dev@mock.local',
  name: 'Dev User (Mock Mode)',
};

/**
 * MockAppProvider is used when VITE_MOCK_MODE=true.
 * Identical to AppProvider but does NOT call useMsal() — so it can be used
 * without a real MsalProvider. Immediately dispatches AUTH_INITIALIZED with a
 * stub user so the rest of the app sees the authenticated state.
 */
export const MockAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducerWithLogging, initialAppState);

  useEffect(() => {
    dispatch({ type: 'AUTH_INITIALIZED', user: MOCK_USER });
  }, []);

  useEffect(() => {
    devLogger.log('🚀 MockAppProvider initialized (VITE_MOCK_MODE=true)');
  }, []);

  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * Hook to access app state and dispatch
 * Throws error if used outside AppProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
