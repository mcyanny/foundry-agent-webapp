import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  Button,
  Spinner,
  Text,
  Input,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ChatAdd24Regular,
  Delete24Regular,
  Search24Regular,
  DismissCircle24Regular,
  ChevronLeft24Regular,
  FolderAdd24Regular,
  Folder24Regular,
  FolderOpen24Regular,
} from '@fluentui/react-icons';
import type { ConversationSummary, Project } from '../types/appState';

interface ConversationSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ConversationSummary[];
  isLoading: boolean;
  hasMore: boolean;
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onLoadMore: () => void;
  // Projects
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: () => void;
}

const SIDEBAR_WIDTH = '280px';

const useStyles = makeStyles({
  panel: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    flexShrink: 0,
    transition: 'width 200ms ease',
    overflow: 'hidden',
  },
  panelCollapsed: {
    width: '0',
    borderRightWidth: '0',
  },
  inner: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: `0 ${tokens.spacingHorizontalM} ${tokens.spacingVerticalM}`,
    overflow: 'hidden',
  },
  newChatButton: {
    width: '100%',
    marginBottom: tokens.spacingVerticalS,
    flexShrink: 0,
  },
  // Projects section
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalXS} 0`,
    flexShrink: 0,
  },
  sectionLabelText: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left',
    gap: tokens.spacingHorizontalXS,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  projectItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  projectItemName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase300,
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: tokens.spacingVerticalXS,
    flexShrink: 0,
  },
  divider: {
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
    margin: `${tokens.spacingVerticalS} 0`,
    flexShrink: 0,
  },
  // Conversations section
  searchBox: {
    marginBottom: tokens.spacingVerticalS,
    flexShrink: 0,
  },
  conversationListWrapper: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  conversationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  conversationItem: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left',
    gap: tokens.spacingHorizontalS,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  conversationItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  conversationTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  conversationDate: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  deleteButton: {
    flexShrink: 0,
    opacity: 0,
    '.conversation-item:hover &, .conversation-item:focus-within &': {
      opacity: 1,
    },
    ':focus': {
      opacity: 1,
    },
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  loadMoreButton: {
    width: '100%',
    marginTop: tokens.spacingVerticalS,
    flexShrink: 0,
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  onOpenChange,
  conversations,
  isLoading,
  hasMore,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onLoadMore,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}) => {
  const styles = useStyles();
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((_: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
    setSearchQuery(data.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(data.value);
    }, 300);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const filteredConversations = useMemo(() => {
    if (!debouncedQuery.trim()) return conversations;
    const query = debouncedQuery.toLowerCase();
    return conversations.filter(c => c.title?.toLowerCase().includes(query));
  }, [conversations, debouncedQuery]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, conversationId: string) => {
      e.stopPropagation();
      onDeleteConversation(conversationId);
    },
    [onDeleteConversation]
  );


  return (
    <div
      className={`${styles.panel}${isOpen ? '' : ` ${styles.panelCollapsed}`}`}
      aria-label="Conversation history"
      aria-hidden={!isOpen}
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <Text className={styles.headerTitle}>Conversations</Text>
          <Button
            appearance="subtle"
            aria-label="Collapse sidebar"
            icon={<ChevronLeft24Regular />}
            onClick={() => onOpenChange(false)}
          />
        </div>

        <div className={styles.body}>
          <Button
            appearance="primary"
            icon={<ChatAdd24Regular />}
            className={styles.newChatButton}
            onClick={onNewChat}
          >
            New Chat
          </Button>

          {/* Projects section */}
          <div className={styles.sectionLabel}>
            <Text className={styles.sectionLabelText}>Projects</Text>
            <Button
              appearance="subtle"
              icon={<FolderAdd24Regular />}
              size="small"
              aria-label="New project"
              onClick={onCreateProject}
              title="New project"
            />
          </div>

          <div className={styles.projectsList}>
            {projects.map(project => (
              <div
                key={project.id}
                className={`${styles.projectItem}${
                  project.id === selectedProjectId ? ` ${styles.projectItemActive}` : ''
                }`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectProject(project.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProject(project.id);
                  }
                }}
              >
                {project.id === selectedProjectId
                  ? <FolderOpen24Regular style={{ flexShrink: 0 }} />
                  : <Folder24Regular style={{ flexShrink: 0, color: tokens.colorNeutralForeground3 }} />}
                <Text className={styles.projectItemName} title={project.name}>
                  {project.name}
                </Text>
              </div>
            ))}

          </div>

          <div className={styles.divider} />

          {/* Conversations section */}
          <div className={styles.sectionLabel}>
            <Text className={styles.sectionLabelText}>All conversations</Text>
          </div>

          {conversations.length > 0 && (
            <Input
              className={styles.searchBox}
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={handleSearchChange}
              contentBefore={<Search24Regular />}
              contentAfter={
                searchQuery ? (
                  <Button
                    appearance="transparent"
                    icon={<DismissCircle24Regular />}
                    size="small"
                    aria-label="Clear search"
                    onClick={handleClearSearch}
                  />
                ) : undefined
              }
              aria-label="Search conversations"
            />
          )}

          <div className={styles.conversationListWrapper}>
            {isLoading && conversations.length === 0 ? (
              <div className={styles.spinnerContainer}>
                <Spinner size="small" label="Loading conversations..." />
              </div>
            ) : filteredConversations.length === 0 && !debouncedQuery ? (
              <div className={styles.emptyState}>
                <Text>No conversations yet</Text>
                <Text size={200}>Start a new chat to begin</Text>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className={styles.noResults}>
                <Text>No conversations match</Text>
                <Text size={200}>Try a different search term</Text>
              </div>
            ) : (
              <>
                <div className={styles.conversationList} role="list">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`conversation-item ${styles.conversationItem} ${
                        conversation.id === currentConversationId
                          ? styles.conversationItemActive
                          : ''
                      }`}
                      role="listitem"
                      onClick={() => onSelectConversation(conversation.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectConversation(conversation.id);
                        }
                      }}
                    >
                      <div className={styles.conversationContent}>
                        <Text
                          weight="semibold"
                          size={300}
                          className={styles.conversationTitle}
                        >
                          {conversation.title || 'Untitled'}
                        </Text>
                        <Text className={styles.conversationDate}>
                          {formatDate(conversation.createdAt)}
                        </Text>
                      </div>
                      <Button
                        appearance="subtle"
                        icon={<Delete24Regular />}
                        size="small"
                        className={styles.deleteButton}
                        aria-label={`Delete conversation: ${conversation.title || 'Untitled'}`}
                        onClick={(e) => handleDelete(e, conversation.id)}
                      />
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <Button
                    appearance="subtle"
                    className={styles.loadMoreButton}
                    onClick={onLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load more conversations'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
