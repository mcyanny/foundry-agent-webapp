import type { Dispatch } from 'react';
import type { AppAction, ConversationSummary, ConversationMessageInfo, Project, VectorStoreFile } from '../types/appState';
import type { IChatItem } from '../types/chat';
import { ChatService } from '../services/chatService';

/**
 * MockChatService simulates the real ChatService without any backend or Azure connection.
 * Used when VITE_MOCK_MODE=true. Produces word-by-word streaming responses locally,
 * dispatching the same reducer actions as the real service so all UI flows work normally.
 */

const MOCK_RESPONSES = [
  `Hello! I'm running in **mock mode** — no backend or Azure connection needed.

This lets you work on the frontend UI without any credentials or infrastructure. The streaming simulation dispatches the same SSE reducer actions as a real backend, so all UI flows work normally.

To connect a real agent, set up your environment with \`azd up\` and remove \`VITE_MOCK_MODE=true\` from \`frontend/.env.local\`.`,

  `Mock mode supports all UI features:

- **Streaming** — text appears word by word, same as a real agent
- **Stop button** — cancels the mock stream mid-response
- **Message queue** — messages sent during streaming are queued and auto-sent on completion
- **New chat** — clears conversation and resets state
- **Regenerate / Edit** — action buttons on messages work normally
- **Theme toggle** — light, dark, and system themes all work

This response is cycling through a set of canned replies.`,

  `Here's a code example to verify markdown rendering:

\`\`\`typescript
const greet = (name: string): string => {
  return \`Hello, \${name}!\`;
};

console.log(greet('World')); // Hello, World!
\`\`\`

And a table:

| Feature | Mock Mode |
|---------|-----------|
| Auth bypass | ✅ |
| Simulated streaming | ✅ |
| Full UI interaction | ✅ |
| Real agent responses | ❌ |`,
];

export class MockChatService extends ChatService {
  private mockIndex = 0;

  constructor(dispatch: Dispatch<AppAction>) {
    // Real API URL and token getter are never used — all methods are overridden
    super('/api', async () => 'mock-token', dispatch);
  }

  override async sendMessage(
    messageText: string,
    currentConversationId: string | null,
    _files?: File[],
    _projectId?: string | null
  ): Promise<void> {
    const userMessage: IChatItem = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      more: { time: new Date().toISOString() },
    };
    this.dispatch({ type: 'CHAT_SEND_MESSAGE', message: userMessage });

    const assistantMessageId = (Date.now() + 1).toString();
    this.dispatch({ type: 'CHAT_ADD_ASSISTANT_MESSAGE', messageId: assistantMessageId });

    const conversationId = currentConversationId ?? `mock-conv-${Date.now()}`;
    this.dispatch({ type: 'CHAT_START_STREAM', conversationId, messageId: assistantMessageId });

    const responseText = MOCK_RESPONSES[this.mockIndex % MOCK_RESPONSES.length];
    this.mockIndex++;

    const startTime = Date.now();
    this.streamCancelled = false;

    // Stream word-by-word to simulate real SSE chunk events
    const words = responseText.split(' ');
    for (const word of words) {
      if (this.streamCancelled) break;
      await delay(35 + Math.random() * 55);
      this.dispatch({
        type: 'CHAT_STREAM_CHUNK',
        messageId: assistantMessageId,
        content: word + ' ',
      });
    }

    if (!this.streamCancelled) {
      this.dispatch({
        type: 'CHAT_STREAM_COMPLETE',
        usage: {
          promptTokens: messageText.split(/\s+/).length,
          completionTokens: words.length,
          totalTokens: messageText.split(/\s+/).length + words.length,
          duration: Date.now() - startTime,
        },
      });
    }
  }

  override cancelStream(): void {
    this.streamCancelled = true;
    this.dispatch({ type: 'CHAT_CANCEL_STREAM' });
  }

  override async sendMcpApproval(
    _approvalRequestId: string,
    _approved: boolean,
    _previousResponseId: string,
    _conversationId: string
  ): Promise<void> {
    // No-op in mock mode
  }

  override async listConversations(
    _limit?: number
  ): Promise<{ conversations: ConversationSummary[]; hasMore: boolean }> {
    return { conversations: [], hasMore: false };
  }

  override async getConversationMessages(
    _conversationId: string
  ): Promise<ConversationMessageInfo[]> {
    return [];
  }

  override async deleteConversation(_conversationId: string): Promise<void> {
    // No-op in mock mode
  }

  // ── Mock project stubs ────────────────────────────────────────────────────

  private mockProjects: Project[] = [
    {
      id: 'mock-project-1',
      name: 'Demo Project',
      description: 'A sample project for testing the projects feature.',
      instructions: 'You are helping with a demo project. Be concise and helpful.',
      vectorStoreId: 'mock-vs-1',
      createdAt: Math.floor(Date.now() / 1000) - 86400,
      fileCount: 0,
    },
  ];

  override async listProjects(): Promise<Project[]> {
    return [...this.mockProjects];
  }

  override async createProject(name: string, description?: string, instructions?: string): Promise<Project> {
    const project: Project = {
      id: `mock-project-${Date.now()}`,
      name,
      description: description ?? '',
      instructions: instructions ?? '',
      vectorStoreId: `mock-vs-${Date.now()}`,
      createdAt: Math.floor(Date.now() / 1000),
      fileCount: 0,
    };
    this.mockProjects.unshift(project);
    return project;
  }

  override async updateProject(id: string, name?: string, description?: string, instructions?: string): Promise<Project> {
    const idx = this.mockProjects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    const updated = {
      ...this.mockProjects[idx],
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(instructions !== undefined && { instructions }),
    };
    this.mockProjects[idx] = updated;
    return updated;
  }

  override async deleteProject(id: string): Promise<void> {
    this.mockProjects = this.mockProjects.filter(p => p.id !== id);
  }

  override async listProjectFiles(_projectId: string): Promise<VectorStoreFile[]> {
    return [];
  }

  override async uploadProjectFile(_projectId: string, file: File): Promise<VectorStoreFile> {
    return {
      fileId: `mock-file-${Date.now()}`,
      fileName: file.name,
      createdAt: Math.floor(Date.now() / 1000),
      fileSizeBytes: file.size,
    };
  }

  override async deleteProjectFile(_projectId: string, _fileId: string): Promise<void> {
    // No-op in mock mode
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
