import React, { createContext, useContext, ReactNode } from 'react';
import { useChatState } from '../hooks/useChatState';
import { useMessageManagement } from '../hooks/useMessageManagement';
import { useChatSession } from '../hooks/useChatSession';
import { useMessageStreaming } from '../hooks/useMessageStreaming';
import { useChatInput } from '../hooks/useChatInput';
import { useChatUI } from '../hooks/useChatUI';
import { chatService } from '../services/chatService';

interface ChatContextValue {
  // Hook managers
  chatState: ReturnType<typeof useChatState>;
  messageManager: ReturnType<typeof useMessageManagement>;
  sessionManager: ReturnType<typeof useChatSession>;
  streamingManager: ReturnType<typeof useMessageStreaming>;
  inputManager: ReturnType<typeof useChatInput>;
  uiManager: ReturnType<typeof useChatUI>;
  
  // Services
  chatService: typeof chatService;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatStateProviderProps {
  children: ReactNode;
  // Props needed for the hooks
  sidebarVisible: boolean;
  toggle: (toggled?: boolean) => void;
  proSearchToggled: boolean;
  shouldShowWelcomeModal: boolean;
  user: any;
  settings: any;
  availableAssistants: any[];
  refreshChatSessions: () => void;
  maxTokens: number;
  selectedDocumentTokens: number;
  setSelectedFiles: (files: any[]) => void;
  llmAcceptsImages: boolean;
  setPopup: (popup: any) => void;
  updateChatState: (state: string, sessionId?: string) => void;
  currentSessionId: () => string;
  chatSessionIdRef: React.MutableRefObject<string | null>;
}

export function ChatStateProvider({
  children,
  sidebarVisible,
  toggle,
  proSearchToggled,
  shouldShowWelcomeModal,
  user,
  settings,
  availableAssistants,
  refreshChatSessions,
  maxTokens,
  selectedDocumentTokens,
  setSelectedFiles,
  llmAcceptsImages,
  setPopup,
  updateChatState,
  currentSessionId,
  chatSessionIdRef,
}: ChatStateProviderProps) {
  // Initialize all the hooks
  const chatState = useChatState();
  const messageManager = useMessageManagement();
  
  const sessionManager = useChatSession(
    availableAssistants,
    refreshChatSessions,
    messageManager.updateCompleteMessageDetail,
    chatState.currentChatAnswering,
    () => {}, // clientScrollToBottom - would need to be passed from parent
    async () => {} // onSubmit - would need to be passed from parent
  );
  
  const streamingManager = useMessageStreaming();
  
  const inputManager = useChatInput(
    maxTokens,
    selectedDocumentTokens,
    setSelectedFiles,
    llmAcceptsImages,
    setPopup,
    updateChatState,
    currentSessionId
  );
  
  const uiManager = useChatUI(
    sidebarVisible,
    toggle,
    proSearchToggled,
    shouldShowWelcomeModal,
    user,
    settings,
    chatSessionIdRef,
    setPopup
  );

  const contextValue: ChatContextValue = {
    chatState,
    messageManager,
    sessionManager,
    streamingManager,
    inputManager,
    uiManager,
    chatService,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatStateProvider');
  }
  return context;
} 