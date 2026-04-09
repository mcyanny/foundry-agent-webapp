import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Button,
  Text,
  Textarea,
  Spinner,
  Input,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ChatAdd24Regular,
  Delete24Regular,
  DocumentAdd24Regular,
  ArrowUpload24Regular,
  Checkmark24Regular,
  Warning24Regular,
  Edit24Regular,
  Send24Regular,
} from '@fluentui/react-icons';
import type { Project, VectorStoreFile, ConversationSummary } from '../types/appState';

interface ProjectDetailViewProps {
  project: Project;
  conversations: ConversationSummary[];
  files: VectorStoreFile[];
  filesLoading: boolean;
  uploadingFiles: string[];
  onEditProject: () => void;
  onNewChat: () => void;
  onStartChat: (initialMessage: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onUpdateInstructions: (instructions: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onDeleteProject: () => Promise<void>;
}

const useStyles = makeStyles({
  root: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  inner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
    gap: tokens.spacingVerticalXL,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    flex: 1,
    minWidth: 0,
  },
  projectIcon: {
    fontSize: '36px',
    lineHeight: 1,
    flexShrink: 0,
    marginTop: '2px',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  projectName: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectDescription: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    lineHeight: 1.4,
  },

  // ── Middle split ──────────────────────────────────────────────────────────
  splitRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  cardSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },

  // Instructions
  instructionsTextarea: {
    width: '100%',
    fontFamily: tokens.fontFamilyBase,
  },
  instructionsSaveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'flex-end',
  },
  savedIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: tokens.colorPaletteGreenForeground1,
    fontSize: tokens.fontSizeBase200,
  },

  // Files
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  fileItemName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase300,
  },
  fileItemMeta: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  uploadingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    opacity: 0.7,
  },
  emptyFiles: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    textAlign: 'center',
    padding: `${tokens.spacingVerticalM} 0`,
  },

  // Conversations
  conversationsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
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
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '100%',
    textAlign: 'left',
    gap: tokens.spacingHorizontalS,
    transition: 'background-color 100ms',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
  },
  conversationTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  conversationDate: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  conversationDeleteBtn: {
    flexShrink: 0,
    opacity: 0,
    '.conversation-row:hover &, .conversation-row:focus-within &': {
      opacity: 1,
    },
    ':focus': { opacity: 1 },
  },
  emptyConversations: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: `${tokens.spacingVerticalL} 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },

  // New chat input row
  newChatRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  newChatInput: {
    flex: 1,
  },

  // Danger zone
  dangerZone: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingBottom: tokens.spacingVerticalL,
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  conversations,
  files,
  filesLoading,
  uploadingFiles,
  onEditProject,
  onNewChat,
  onStartChat,
  onSelectConversation,
  onDeleteConversation,
  onUpdateInstructions,
  onUploadFile,
  onDeleteFile,
  onDeleteProject,
}) => {
  const styles = useStyles();

  // Instructions state
  const [instructions, setInstructions] = useState(project.instructions);
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New chat input
  const [newChatText, setNewChatText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when project changes
  useEffect(() => {
    setInstructions(project.instructions);
    setInstructionsDirty(false);
    setSavedIndicator(false);
    setDeleteConfirm(false);
  }, [project.id]);

  useEffect(() => {
    if (!instructionsDirty) {
      setInstructions(project.instructions);
    }
  }, [project.instructions, instructionsDirty]);

  const handleInstructionsChange = useCallback((_: unknown, data: { value: string }) => {
    setInstructions(data.value);
    setInstructionsDirty(true);
    setSavedIndicator(false);
  }, []);

  const handleInstructionsSave = useCallback(async () => {
    setSavingInstructions(true);
    try {
      await onUpdateInstructions(instructions);
      setInstructionsDirty(false);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 3000);
    } finally {
      setSavingInstructions(false);
    }
  }, [instructions, onUpdateInstructions]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onUploadFile]);

  const handleDeleteProject = useCallback(async () => {
    setDeleting(true);
    try {
      await onDeleteProject();
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }, [onDeleteProject]);

  const handleConversationDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDeleteConversation(id);
    },
    [onDeleteConversation]
  );

  const handleSendNewChat = useCallback(() => {
    const text = newChatText.trim();
    if (!text) {
      onNewChat();
    } else {
      setNewChatText('');
      onStartChat(text);
    }
  }, [newChatText, onNewChat, onStartChat]);

  return (
    <div className={styles.root}>
      <div className={styles.inner}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.projectIcon} role="img" aria-label="project">📁</span>
            <div className={styles.headerText}>
              <Text className={styles.projectName}>{project.name}</Text>
              {project.description && (
                <Text className={styles.projectDescription}>{project.description}</Text>
              )}
            </div>
          </div>
          <Button
            appearance="subtle"
            icon={<Edit24Regular />}
            onClick={onEditProject}
            aria-label="Edit project"
          >
            Edit
          </Button>
        </div>

        {/* ── Instructions | Files ── */}
        <div className={styles.splitRow}>
          {/* Instructions */}
          <div className={styles.card}>
            <div>
              <Text className={styles.cardTitle} block>Project instructions</Text>
              <Text className={styles.cardSubtitle} block>
                Added to every chat in this project
              </Text>
            </div>
            <Textarea
              className={styles.instructionsTextarea}
              value={instructions}
              onChange={handleInstructionsChange}
              placeholder="You are an expert in… Always respond with… Focus on…"
              rows={6}
              resize="vertical"
            />
            <div className={styles.instructionsSaveRow}>
              {savedIndicator && (
                <span className={styles.savedIndicator}>
                  <Checkmark24Regular style={{ fontSize: 14 }} /> Saved
                </span>
              )}
              <Button
                appearance="primary"
                size="small"
                onClick={handleInstructionsSave}
                disabled={!instructionsDirty || savingInstructions}
              >
                {savingInstructions ? 'Saving…' : 'Save instructions'}
              </Button>
            </div>
          </div>

          {/* Files */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Text className={styles.cardTitle} block>Knowledge files</Text>
                <Text className={styles.cardSubtitle} block>
                  Searchable in every chat
                </Text>
              </div>
              <Button
                appearance="secondary"
                size="small"
                icon={<ArrowUpload24Regular />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles.length > 0}
              >
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.txt,.md,.csv,.json,.html,.xml"
            />
            {filesLoading ? (
              <Spinner size="small" label="Loading files…" />
            ) : (
              <div className={styles.fileList}>
                {uploadingFiles.map(name => (
                  <div key={name} className={styles.uploadingItem}>
                    <Spinner size="tiny" />
                    <Text className={styles.fileItemName}>{name}</Text>
                    <Text className={styles.fileItemMeta}>Uploading…</Text>
                  </div>
                ))}
                {files.length === 0 && uploadingFiles.length === 0 ? (
                  <Text className={styles.emptyFiles}>
                    No files yet. Upload a PDF, markdown, or text file.
                  </Text>
                ) : (
                  files.map(f => (
                    <div key={f.fileId} className={styles.fileItem}>
                      <DocumentAdd24Regular style={{ flexShrink: 0, color: tokens.colorNeutralForeground3 }} />
                      <Text className={styles.fileItemName} title={f.fileName}>{f.fileName}</Text>
                      <Text className={styles.fileItemMeta}>{formatFileSize(f.fileSizeBytes)}</Text>
                      <Button
                        appearance="subtle"
                        icon={<Delete24Regular />}
                        size="small"
                        aria-label={`Remove ${f.fileName}`}
                        onClick={() => onDeleteFile(f.fileId)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Conversations + new chat ── */}
        <div className={styles.conversationsCard}>
          <div className={styles.cardHeader}>
            <div>
              <Text className={styles.cardTitle} block>Conversations</Text>
              <Text className={styles.cardSubtitle} block>
                {conversations.length > 0
                  ? `${conversations.length} chat${conversations.length !== 1 ? 's' : ''}`
                  : 'No chats yet'}
              </Text>
            </div>
            <Button
              appearance="subtle"
              size="small"
              icon={<ChatAdd24Regular />}
              onClick={onNewChat}
            >
              New chat
            </Button>
          </div>

          {conversations.length === 0 ? (
            <div className={styles.emptyConversations}>
              <Text weight="semibold">No conversations yet</Text>
              <Text size={200}>Start one below — your instructions and files will be active</Text>
            </div>
          ) : (
            <div className={styles.conversationList}>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-row ${styles.conversationItem}`}
                  onClick={() => onSelectConversation(conv.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectConversation(conv.id);
                    }
                  }}
                >
                  <div className={styles.conversationContent}>
                    <Text className={styles.conversationTitle}>{conv.title || 'Untitled'}</Text>
                    <Text className={styles.conversationDate}>{formatDate(conv.createdAt)}</Text>
                  </div>
                  <Button
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    size="small"
                    className={styles.conversationDeleteBtn}
                    aria-label={`Delete ${conv.title || 'Untitled'}`}
                    onClick={e => handleConversationDelete(e, conv.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* New chat input */}
          <div className={styles.newChatRow}>
            <Input
              className={styles.newChatInput}
              placeholder="Start a new chat in this project…"
              value={newChatText}
              onChange={(_e, d) => setNewChatText(d.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendNewChat();
                }
              }}
            />
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={handleSendNewChat}
              aria-label="Start chat"
            >
              Start
            </Button>
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div className={styles.dangerZone}>
          {deleteConfirm ? (
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' }}>
              <Warning24Regular style={{ color: tokens.colorPaletteRedForeground3 }} />
              <Text size={200}>Delete project and all its files?</Text>
              <Button
                appearance="primary"
                size="small"
                onClick={handleDeleteProject}
                disabled={deleting}
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button appearance="subtle" size="small" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete24Regular />}
              onClick={() => setDeleteConfirm(true)}
              style={{ color: tokens.colorPaletteRedForeground3 }}
            >
              Delete project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
