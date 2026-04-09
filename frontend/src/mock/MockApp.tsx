import { AgentChat } from '../components/AgentChat';
import '../App.css';

const MOCK_STARTER_PROMPTS = [
  'Hello! Test the chat interface',
  'Show me mock streaming text word by word',
  'Test markdown: **bold**, _italic_, `code`, and a table',
];

/**
 * MockApp renders the chat UI without any Azure AD authentication.
 * Used when VITE_MOCK_MODE=true. Replaces App.tsx so that useMsalAuthentication
 * (which would redirect to Azure AD) is never called.
 */
export function MockApp() {
  return (
    <div className="app-container">
      <AgentChat
        agentId="mock-agent"
        agentName="Mock Agent"
        agentDescription="Frontend development mode — no backend or Azure required"
        starterPrompts={MOCK_STARTER_PROMPTS}
      />
    </div>
  );
}
