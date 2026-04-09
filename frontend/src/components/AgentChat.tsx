import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@fluentui/react-components';
import { PanelLeft24Regular } from '@fluentui/react-icons';
import { ChatInterface } from './ChatInterface';
import { ConversationSidebar } from './ConversationSidebar';
import { ProjectDetailView } from './ProjectDetailView';
import { ProjectCreateView } from './ProjectCreateView';
import { SettingsPanel } from './core/SettingsPanel';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { ChatService } from '../services/chatService';
import { MockChatService } from '../mock/mockChatService';
import { useAppContext } from '../contexts/AppContext';
import { exportAsMarkdown, downloadMarkdown } from '../utils/exportConversation';
import { trackFeedback } from '../services/telemetry';
import type { IChatItem } from '../types/chat';
import type { VectorStoreFile } from '../types/appState';
import styles from './AgentChat.module.css';

interface AgentChatProps {
  agentId: string;
  agentName: string;
  agentDescription?: string;
  agentLogo?: string;
  starterPrompts?: string[];
}

type ActiveView =
  | { kind: 'chat' }
  | { kind: 'project-detail'; projectId: string }
  | { kind: 'create-project' }
  | { kind: 'edit-project'; projectId: string };

export const AgentChat: React.FC<AgentChatProps> = ({ agentName, agentDescription, agentLogo, starterPrompts }) => {
  const { chat, state } = useAppState();
  const { dispatch } = useAppContext();
  const { getAccessToken } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [activeView, setActiveView] = useState<ActiveView>({ kind: 'chat' });
  const [projectFiles, setProjectFiles] = useState<VectorStoreFile[]>([]);
  const [projectFilesLoading, setProjectFilesLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

  const chatService = useMemo(() => {
    return MOCK_MODE
      ? new MockChatService(dispatch)
      : new ChatService(apiUrl, getAccessToken, dispatch);
  }, [MOCK_MODE, apiUrl, getAccessToken, dispatch]);

  const handleSendMessage = async (text: string, files?: File[]) => {
    if (chat.status === 'streaming' || chat.status === 'sending') {
      dispatch({ type: 'CHAT_QUEUE_MESSAGE', text, files });
      return;
    }
    await chatService.sendMessage(text, chat.currentConversationId, files, state.projects.selectedProjectId);
  };

  const pendingRef = useRef(chat.pendingMessages);
  pendingRef.current = chat.pendingMessages;

  useEffect(() => {
    if (chat.status === 'idle' && pendingRef.current.length > 0) {
      const combinedText = pendingRef.current.map(m => m.text).join('\n\n');
      const combinedFiles = pendingRef.current.flatMap(m => m.files || []);
      dispatch({ type: 'CHAT_CLEAR_QUEUE' });
      chatService.sendMessage(
        combinedText,
        chat.currentConversationId,
        combinedFiles.length > 0 ? combinedFiles : undefined,
        state.projects.selectedProjectId
      );
    }
  }, [chat.status, chat.currentConversationId, chatService, dispatch, state.projects.selectedProjectId]);

  const handleDequeueMessage = (index: number) => {
    dispatch({ type: 'CHAT_DEQUEUE_MESSAGE', index });
  };

  const handleClearError = () => chatService.clearError();

  const handleNewChat = useCallback(() => {
    chatService.cancelStream();
    chatService.clearChat();
    setActiveView({ kind: 'chat' });
  }, [chatService]);

  const handleCancelStream = () => chatService.cancelStream();

  const handleRecoveredInputConsumed = () => dispatch({ type: 'CHAT_CONSUMED_RECOVERED_INPUT' });

  const handleRegenerate = useCallback(() => {
    chatService.cancelStream();
    dispatch({ type: 'CHAT_REGENERATE' });
  }, [chatService, dispatch]);

  const handleEditMessage = useCallback((messageId: string, newText: string) => {
    dispatch({ type: 'CHAT_EDIT_MESSAGE', messageId, newText });
  }, [dispatch]);

  const handleFeedback = useCallback((messageId: string, rating: 'positive' | 'negative') => {
    trackFeedback(messageId, chat.currentConversationId, rating);
  }, [chat.currentConversationId]);

  const handleCancelEdit = useCallback(() => {
    dispatch({ type: 'CHAT_CANCEL_EDIT' });
  }, [dispatch]);

  const handleDownloadFile = useCallback(async (fileId: string, fileName: string, containerId?: string) => {
    try {
      await chatService.downloadFile(fileId, fileName, containerId);
    } catch (err) {
      dispatch({
        type: 'CHAT_ERROR',
        error: { code: 'NETWORK', message: `Failed to download ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`, recoverable: true },
      });
    }
  }, [chatService, dispatch]);

  useEffect(() => {
    if (chat.regenerateText?.trim() && chat.status === 'idle') {
      const text = chat.regenerateText;
      dispatch({ type: 'CHAT_CONSUMED_REGENERATE' });
      chatService.sendMessage(text, chat.currentConversationId, undefined, state.projects.selectedProjectId);
    }
  }, [chat.regenerateText, chat.status, chat.currentConversationId, chatService, dispatch, state.projects.selectedProjectId]);

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
      dispatch({ type: 'CHAT_MCP_APPROVAL_RESOLVED', approvalRequestId, resolved: undefined });
    }
  };

  const handleExportConversation = useCallback(() => {
    const md = exportAsMarkdown(chat.messages, agentName);
    downloadMarkdown(md);
  }, [chat.messages, agentName]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    dispatch({ type: 'CONVERSATIONS_LOADING' });
    try {
      const result = await chatService.listConversations();
      dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: result.conversations, hasMore: result.hasMore });
    } catch {
      dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: [], hasMore: false });
    }
  }, [chatService, dispatch]);

  const loadProjects = useCallback(async () => {
    dispatch({ type: 'PROJECTS_LOADING' });
    try {
      const projects = await chatService.listProjects();
      dispatch({ type: 'PROJECTS_SET_LIST', projects });
    } catch {
      dispatch({ type: 'PROJECTS_SET_LIST', projects: [] });
    }
  }, [chatService, dispatch]);

  const loadProjectFiles = useCallback(async (projectId: string) => {
    setProjectFilesLoading(true);
    setProjectFiles([]);
    try {
      const files = await chatService.listProjectFiles(projectId);
      setProjectFiles(files);
    } catch {
      // leave empty
    } finally {
      setProjectFilesLoading(false);
    }
  }, [chatService]);

  useEffect(() => {
    loadConversations();
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const handleToggleSidebar = useCallback(() => {
    dispatch({ type: 'CONVERSATIONS_TOGGLE_SIDEBAR' });
  }, [dispatch]);

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
      const newItems = result.conversations.slice(currentCount);
      dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: newItems, hasMore: newItems.length > 0 && result.hasMore, append: true });
    } catch {
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
      setActiveView({ kind: 'chat' });
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [chatService, dispatch]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    dispatch({ type: 'CONVERSATIONS_REMOVE', conversationId });
    if (chat.currentConversationId === conversationId) {
      chatService.clearChat();
    }
    try {
      await chatService.deleteConversation(conversationId);
    } catch {
      // best-effort
    }
  }, [chatService, dispatch, chat.currentConversationId]);

  // ── Project navigation ────────────────────────────────────────────────────

  const handleSelectProject = useCallback((projectId: string | null) => {
    dispatch({ type: 'PROJECTS_SELECT', projectId });
    chatService.cancelStream();
    chatService.clearChat();
    if (projectId === null) {
      setActiveView({ kind: 'chat' });
    } else {
      setActiveView({ kind: 'project-detail', projectId });
      loadProjectFiles(projectId);
    }
  }, [dispatch, chatService, loadProjectFiles]);

  // Sidebar "+" opens the create-project full-screen view
  const handleOpenCreateProject = useCallback(() => {
    setActiveView({ kind: 'create-project' });
  }, []);

  // ── Project CRUD ──────────────────────────────────────────────────────────

  const handleConfirmCreateProject = useCallback(async (name: string, description: string) => {
    const project = await chatService.createProject(name, description);
    dispatch({ type: 'PROJECTS_ADD', project });
    dispatch({ type: 'PROJECTS_SELECT', projectId: project.id });
    setProjectFiles([]);
    setProjectFilesLoading(false);
    setActiveView({ kind: 'project-detail', projectId: project.id });
  }, [chatService, dispatch]);

  const handleOpenEditProject = useCallback(() => {
    if (activeView.kind === 'project-detail') {
      setActiveView({ kind: 'edit-project', projectId: activeView.projectId });
    }
  }, [activeView]);

  const handleConfirmEditProject = useCallback(async (name: string, description: string) => {
    const projectId =
      activeView.kind === 'edit-project' ? activeView.projectId : null;
    if (!projectId) return;
    const updated = await chatService.updateProject(projectId, name, description, undefined);
    dispatch({ type: 'PROJECTS_UPDATE', project: updated });
    setActiveView({ kind: 'project-detail', projectId });
  }, [chatService, dispatch, activeView]);

  const handleCancelProjectForm = useCallback(() => {
    if (activeView.kind === 'edit-project') {
      setActiveView({ kind: 'project-detail', projectId: activeView.projectId });
    } else {
      setActiveView({ kind: 'chat' });
    }
  }, [activeView]);

  const handleUpdateInstructions = useCallback(async (instructions: string) => {
    const projectId = activeView.kind === 'project-detail' ? activeView.projectId : null;
    if (!projectId) return;
    const project = state.projects.list.find(p => p.id === projectId);
    if (!project) return;
    const updated = await chatService.updateProject(projectId, project.name, project.description, instructions);
    dispatch({ type: 'PROJECTS_UPDATE', project: updated });
  }, [chatService, dispatch, activeView, state.projects.list]);

  const handleProjectDelete = useCallback(async () => {
    const projectId = activeView.kind === 'project-detail' ? activeView.projectId : null;
    if (!projectId) return;
    await chatService.deleteProject(projectId);
    dispatch({ type: 'PROJECTS_REMOVE', projectId });
    dispatch({ type: 'PROJECTS_SELECT', projectId: null });
    setActiveView({ kind: 'chat' });
    chatService.clearChat();
  }, [chatService, dispatch, activeView]);

  const handleProjectFileUpload = useCallback(async (file: File) => {
    const projectId = activeView.kind === 'project-detail' ? activeView.projectId : null;
    if (!projectId) return;
    setUploadingFiles(prev => [...prev, file.name]);
    try {
      const uploaded = await chatService.uploadProjectFile(projectId, file);
      setProjectFiles(prev => [...prev, uploaded]);
    } finally {
      setUploadingFiles(prev => prev.filter(n => n !== file.name));
    }
  }, [chatService, activeView]);

  const handleProjectFileDelete = useCallback(async (fileId: string) => {
    const projectId = activeView.kind === 'project-detail' ? activeView.projectId : null;
    if (!projectId) return;
    await chatService.deleteProjectFile(projectId, fileId);
    setProjectFiles(prev => prev.filter(f => f.fileId !== fileId));
  }, [chatService, activeView]);

  // Start a chat with an initial message from the project detail new-chat input
  const handleStartChatInProject = useCallback((initialMessage: string) => {
    chatService.cancelStream();
    chatService.clearChat();
    setActiveView({ kind: 'chat' });
    chatService.sendMessage(initialMessage, null, undefined, state.projects.selectedProjectId);
  }, [chatService, state.projects.selectedProjectId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const currentProjectId =
    activeView.kind === 'project-detail' ? activeView.projectId :
    activeView.kind === 'edit-project' ? activeView.projectId :
    null;

  const currentProject = currentProjectId
    ? state.projects.list.find(p => p.id === currentProjectId) ?? null
    : null;

  const projectConversations = useMemo(() =>
    currentProject
      ? state.conversations.list.filter(c => c.projectId === currentProject.id)
      : [],
    [currentProject, state.conversations.list]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const renderMainArea = () => {
    if (activeView.kind === 'create-project') {
      return (
        <ProjectCreateView
          mode="create"
          onSubmit={handleConfirmCreateProject}
          onCancel={handleCancelProjectForm}
        />
      );
    }

    if (activeView.kind === 'edit-project' && currentProject) {
      return (
        <ProjectCreateView
          mode="edit"
          initialName={currentProject.name}
          initialDescription={currentProject.description}
          onSubmit={handleConfirmEditProject}
          onCancel={handleCancelProjectForm}
        />
      );
    }

    if (activeView.kind === 'project-detail' && currentProject) {
      return (
        <ProjectDetailView
          project={currentProject}
          conversations={projectConversations}
          files={projectFiles}
          filesLoading={projectFilesLoading}
          uploadingFiles={uploadingFiles}
          onEditProject={handleOpenEditProject}
          onNewChat={handleNewChat}
          onStartChat={handleStartChatInProject}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onUpdateInstructions={handleUpdateInstructions}
          onUploadFile={handleProjectFileUpload}
          onDeleteFile={handleProjectFileDelete}
          onDeleteProject={handleProjectDelete}
        />
      );
    }

    return (
      <ChatInterface
        messages={chat.messages}
        status={chat.status}
        error={chat.error}
        streamingMessageId={chat.streamingMessageId}
        recoveredInput={chat.recoveredInput}
        recoveredAttachments={chat.recoveredAttachments}
        onSendMessage={handleSendMessage}
        onClearError={handleClearError}
        onRecoveredInputConsumed={handleRecoveredInputConsumed}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={handleNewChat}
        onCancelStream={handleCancelStream}
        onMcpApproval={handleMcpApproval}
        onToggleSidebar={handleToggleSidebar}
        onExportConversation={handleExportConversation}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        onCancelEdit={handleCancelEdit}
        isEditing={!!chat.editSnapshot}
        onFeedback={handleFeedback}
        onDownloadFile={handleDownloadFile}
        conversationId={chat.currentConversationId}
        pendingMessages={chat.pendingMessages}
        onDequeueMessage={handleDequeueMessage}
        hasMessages={chat.messages.length > 0}
        disabled={false}
        agentName={agentName}
        agentDescription={agentDescription}
        agentLogo={agentLogo}
        starterPrompts={starterPrompts}
      />
    );
  };

  return (
    <div className={styles.content}>
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
        projects={state.projects.list}
        selectedProjectId={state.projects.selectedProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleOpenCreateProject}
      />

      <div className={styles.mainContent}>
        {!state.conversations.sidebarOpen && (
          <Button
            appearance="subtle"
            icon={<PanelLeft24Regular />}
            aria-label="Open sidebar"
            className={styles.sidebarToggle}
            onClick={handleToggleSidebar}
          />
        )}
        {renderMainArea()}
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
};
