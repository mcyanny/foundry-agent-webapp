import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { FolderAdd24Regular } from '@fluentui/react-icons';

interface ProjectCreateViewProps {
  mode: 'create' | 'edit';
  initialName?: string;
  initialDescription?: string;
  onSubmit: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingVerticalXXL,
    overflowY: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  icon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  hint: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  input: {
    width: '100%',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    fontFamily: tokens.fontFamilyBase,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
  },
});

export const ProjectCreateView: React.FC<ProjectCreateViewProps> = ({
  mode,
  initialName = '',
  initialDescription = '',
  onSubmit,
  onCancel,
}) => {
  const styles = useStyles();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmedName, description.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  const isEdit = mode === 'edit';

  return (
    <div className={styles.root}>
      <div className={styles.card} onKeyDown={handleKeyDown}>
        <div className={styles.titleRow}>
          <FolderAdd24Regular className={styles.icon} fontSize={28} />
          <Text className={styles.title}>
            {isEdit ? 'Edit project' : 'Create project'}
          </Text>
        </div>

        <div className={styles.field}>
          <Label className={styles.label} htmlFor="project-name" required>
            Project name
          </Label>
          <Input
            ref={nameInputRef}
            id="project-name"
            className={styles.input}
            placeholder="e.g. Legal Research, Q4 Marketing"
            value={name}
            onChange={(_e, d) => setName(d.value)}
            disabled={submitting}
            size="large"
          />
        </div>

        <div className={styles.field}>
          <Label className={styles.label} htmlFor="project-description">
            Description
            <Text className={styles.hint}> — optional</Text>
          </Label>
          <Textarea
            id="project-description"
            className={styles.textarea}
            placeholder="What is this project for? (shown in the project header)"
            value={description}
            onChange={(_e, d) => setDescription(d.value)}
            disabled={submitting}
            rows={3}
            resize="vertical"
          />
        </div>

        <div className={styles.actions}>
          <Button appearance="subtle" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
          >
            {submitting
              ? isEdit ? 'Saving…' : 'Creating…'
              : isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </div>
    </div>
  );
};
