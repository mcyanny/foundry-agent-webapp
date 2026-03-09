import React, { useState, useMemo, useCallback } from 'react';
import { ChatInterface } from './ChatInterface';
import { ConversationSidebar } from './ConversationSidebar';
import { SettingsPanel } from './core/SettingsPanel';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { ChatService } from '../services/chatService';
import { useAppContext } from '../contexts/AppContext';
import type { IChatItem } from '../types/chat';
import styles from './AgentPreview.module.css';

interface AgentPreviewProps {
  agentId: string;
  agentName: string;
  agentDescription?: string;
  agentLogo?: string;
  starterPrompts?: string[];
}

export const AgentPreview: React.FC<AgentPreviewProps> = ({ agentName, agentDescription, agentLogo, starterPrompts }) => {
  const { chat, state } = useAppState();
  const { dispatch } = useAppContext();
  const { getAccessToken } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Create service instances
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  
  const chatService = useMemo(() => {
    return new ChatService(apiUrl, getAccessToken, dispatch);
  }, [apiUrl, getAccessToken, dispatch]);

  const handleSendMessage = async (text: string, files?: File[]) => {
    await chatService.sendMessage(text, chat.currentConversationId, files);
  };

  const handleClearError = () => {
    chatService.clearError();
  };

  const handleNewChat = () => {
    chatService.cancelStream();
    chatService.clearChat();
  };

  const handleCancelStream = () => {
    chatService.cancelStream();
  };

  const handleMcpApproval = async (
    approvalRequestId: string,
    approved: boolean,
    previousResponseId: string,
    conversationId: string
  ) => {
    dispatch({ type: 'CHAT_MCP_APPROVAL_RESOLVED', approvalRequestId, resolved: approved ? 'approved' : 'rejected' });
    try {
      await chatService.sendMcpApproval(approvalRequestId, approved, previousResponseId, conversationId);
    } catch {
      // Rollback so user can retry — clears resolved state, restoring buttons
      dispatch({ type: 'CHAT_MCP_APPROVAL_RESOLVED', approvalRequestId, resolved: undefined });
    }
  };

  const handleToggleSidebar = useCallback(async () => {
    const willOpen = !state.conversations.sidebarOpen;
    dispatch({ type: 'CONVERSATIONS_TOGGLE_SIDEBAR' });
    if (willOpen) {
      dispatch({ type: 'CONVERSATIONS_LOADING' });
      try {
        const result = await chatService.listConversations();
        dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: result.conversations, hasMore: result.hasMore });
      } catch (error) {
        console.error('Failed to load conversations:', error);
        dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: [], hasMore: false });
      }
    }
  }, [state.conversations.sidebarOpen, dispatch, chatService]);

  const handleSidebarOpenChange = useCallback((open: boolean) => {
    if (!open && state.conversations.sidebarOpen) {
      dispatch({ type: 'CONVERSATIONS_TOGGLE_SIDEBAR' });
    }
  }, [state.conversations.sidebarOpen, dispatch]);

  const handleLoadMoreConversations = useCallback(async () => {
    dispatch({ type: 'CONVERSATIONS_LOADING' });
    try {
      const currentCount = state.conversations.list.length;
      const result = await chatService.listConversations(currentCount + 20);
      // Slice off items we already have and append only new ones
      const newItems = result.conversations.slice(currentCount);
      // If no new items returned (e.g., backend limit cap), stop pagination
      const hasMore = newItems.length > 0 && result.hasMore;
      dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: newItems, hasMore, append: true });
    } catch (error) {
      console.error('Failed to load more conversations:', error);
      dispatch({ type: 'CONVERSATIONS_LOADING_DONE' });
    }
  }, [state.conversations.list.length, dispatch, chatService]);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    try {
      chatService.cancelStream();
      const messages = await chatService.getConversationMessages(conversationId);
      const chatItems: IChatItem[] = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map((msg, index) => ({
          id: `${conversationId}-${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          more: { time: new Date().toISOString() },
        }));

      dispatch({ type: 'CHAT_LOAD_CONVERSATION', conversationId, messages: chatItems });
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [chatService, dispatch]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    // Remove from UI immediately (optimistic)
    dispatch({ type: 'CONVERSATIONS_REMOVE', conversationId });
    if (chat.currentConversationId === conversationId) {
      chatService.clearChat();
    }
    // Attempt server-side delete (may not be supported yet)
    try {
      await chatService.deleteConversation(conversationId);
    } catch (error) {
      // 501 = SDK doesn't support delete yet — item is hidden locally only
      console.warn('Server-side conversation delete not available:', error);
    }
  }, [chatService, dispatch, chat.currentConversationId]);

  return (
    <div className={styles.content}>
      <div className={styles.mainContent}>
        <ChatInterface 
          messages={chat.messages}
          status={chat.status}
          error={chat.error}
          streamingMessageId={chat.streamingMessageId}
          onSendMessage={handleSendMessage}
          onClearError={handleClearError}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewChat={handleNewChat}
          onCancelStream={handleCancelStream}
          onMcpApproval={handleMcpApproval}
          onToggleSidebar={handleToggleSidebar}
          conversationId={chat.currentConversationId}
          hasMessages={chat.messages.length > 0}
          disabled={false}
          agentName={agentName}
          agentDescription={agentDescription}
          agentLogo={agentLogo}
          starterPrompts={starterPrompts}
        />
      </div>

      <ConversationSidebar
        isOpen={state.conversations.sidebarOpen}
        onOpenChange={handleSidebarOpenChange}
        conversations={state.conversations.list}
        isLoading={state.conversations.isLoading}
        hasMore={state.conversations.hasMore}
        currentConversationId={chat.currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onLoadMore={handleLoadMoreConversations}
      />
      
      <SettingsPanel
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
};
