import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackendChatSession, ChatSessionSharedStatus } from '../interfaces';
import { processRawChatHistory, buildLatestMessageChain, nameChatSession, shouldSubmitOnLoad } from '../lib';
import { SEARCH_PARAM_NAMES } from '../searchParams';
import { Persona } from '../../admin/assistants/interfaces';

export interface ChatSessionManager {
  // Session state
  existingChatSessionId: string | null;
  isFetchingChatMessages: boolean;
  chatSessionSharedStatus: ChatSessionSharedStatus;
  hasPerformedInitialScroll: boolean;
  submitOnLoadPerformed: React.MutableRefObject<boolean>;
  maxTokens: number;
  
  // Session operations
  loadChatSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<void>;
  switchSession: (sessionId: string | null) => void;
  updateSessionSharedStatus: (status: ChatSessionSharedStatus) => void;
  
  // Assistant management
  selectedAssistant: Persona | undefined;
  setSelectedAssistant: (assistant: Persona | undefined) => void;
  setSelectedAssistantFromId: (assistantId: number) => void;
  
  // Scroll management
  setHasPerformedInitialScroll: (value: boolean) => void;
  scrollInitialized: React.MutableRefObject<boolean>;
  
  // Message display
  selectedMessageForDocDisplay: number | null;
  setSelectedMessageForDocDisplay: (messageId: number | null) => void;
  
  // Token management
  fetchMaxTokens: (liveAssistant: Persona | undefined) => Promise<void>;
  
  // External integrations
  handleSlackChatRedirect: (slackChatId: string | null) => Promise<void>;
  calculateTokensAndUpdateSearchMode: (selectedFiles: any[], selectedFolders: any[], currentLlm: any) => Promise<void>;
}

export function useChatSession(
  availableAssistants: Persona[],
  refreshChatSessions: () => void,
  updateCompleteMessageDetail: (sessionId: string | null, messageMap: Map<number, any>) => void,
  currentChatAnswering: () => boolean,
  clientScrollToBottom: (fast?: boolean) => void,
  onSubmit: (params?: any) => Promise<void>,
  // Additional parameters for new functions
  router: any,
  setPopup: (popup: any) => void,
  setIsReady: (ready: boolean) => void
): ChatSessionManager {
  const searchParams = useSearchParams();
  
  const [existingChatSessionId, setExistingChatSessionId] = useState<string | null>(null);
  const [isFetchingChatMessages, setIsFetchingChatMessages] = useState(false);
  const [chatSessionSharedStatus, setChatSessionSharedStatus] = useState<ChatSessionSharedStatus>(
    ChatSessionSharedStatus.Private
  );
  const [hasPerformedInitialScroll, setHasPerformedInitialScroll] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Persona | undefined>();
  const [selectedMessageForDocDisplay, setSelectedMessageForDocDisplay] = useState<number | null>(null);
  const [maxTokens, setMaxTokens] = useState<number>(4096);
  
  const submitOnLoadPerformed = useRef<boolean>(false);
  const scrollInitialized = useRef<boolean>(false);
  const chatSessionIdRef = useRef<string | null>(null);
  const loadedIdSessionRef = useRef<string | null>(null);
  const isInitialLoad = useRef<boolean>(true);

  const defaultAssistantIdRaw = searchParams?.get(SEARCH_PARAM_NAMES.PERSONA_ID);
  const defaultAssistantId = defaultAssistantIdRaw ? parseInt(defaultAssistantIdRaw) : undefined;

  const setSelectedAssistantFromId = useCallback((assistantId: number) => {
    setSelectedAssistant(
      availableAssistants.find((assistant) => assistant.id === assistantId)
    );
  }, [availableAssistants]);

  const fetchMaxTokens = useCallback(async (liveAssistant: Persona | undefined) => {
    const response = await fetch(
      `/api/chat/max-selected-document-tokens?persona_id=${liveAssistant?.id}`
    );
    if (response.ok) {
      const maxTokens = (await response.json()).max_tokens as number;
      setMaxTokens(maxTokens);
    }
  }, []);

  const handleSlackChatRedirect = useCallback(async (slackChatId: string | null) => {
    if (!slackChatId) return;

    // Set isReady to false before starting retrieval to display loading text
    setIsReady(false);

    try {
      const response = await fetch("/api/chat/seed-chat-session-from-slack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_session_id: slackChatId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to seed chat from Slack");
      }

      const data = await response.json();
      router.push(data.redirect_url);
    } catch (error) {
      console.error("Error seeding chat from Slack:", error);
      setPopup({
        message: "Failed to load chat from Slack",
        type: "error",
      });
    }
  }, [router, setPopup, setIsReady]);

  const calculateTokensAndUpdateSearchMode = useCallback(async (selectedFiles: any[], selectedFolders: any[], currentLlm: any) => {
    if (selectedFiles.length > 0 || selectedFolders.length > 0) {
      try {
        // Prepare the query parameters for the API call
        const fileIds = selectedFiles.map((file: any) => file.id);
        const folderIds = selectedFolders.map((folder: any) => folder.id);

        // Build the query string
        const queryParams = new URLSearchParams();
        fileIds.forEach((id) =>
          queryParams.append("file_ids", id.toString())
        );
        folderIds.forEach((id) =>
          queryParams.append("folder_ids", id.toString())
        );

        // Make the API call to get token estimate
        const response = await fetch(
          `/api/user/file/token-estimate?${queryParams.toString()}`
        );

        if (!response.ok) {
          console.error("Failed to fetch token estimate");
          return;
        }
      } catch (error) {
        console.error("Error calculating tokens:", error);
      }
    }
  }, []);

  const loadChatSession = useCallback(async (sessionId: string) => {
    setIsFetchingChatMessages(true);
    
    try {
      const response = await fetch(`/api/chat/get-chat-session/${sessionId}`);
      const session = await response.json();
      const chatSession = session as BackendChatSession;
      
      setSelectedAssistantFromId(chatSession.persona_id);
      setChatSessionSharedStatus(chatSession.shared_status);

      const newMessageMap = processRawChatHistory(chatSession.messages);
      const newMessageHistory = buildLatestMessageChain(newMessageMap);

      // Update message history except for edge case where last message is an error
      if (!currentChatAnswering()) {
        const latestMessageId = newMessageHistory[newMessageHistory.length - 1]?.messageId;
        setSelectedMessageForDocDisplay(latestMessageId !== undefined ? latestMessageId : null);
        updateCompleteMessageDetail(chatSession.chat_session_id, newMessageMap);
      }

      // Handle scrolling
      scrollInitialized.current = false;
      if (!hasPerformedInitialScroll) {
        if (isInitialLoad.current) {
          setHasPerformedInitialScroll(true);
          isInitialLoad.current = false;
        }
        clientScrollToBottom();
        setTimeout(() => {
          setHasPerformedInitialScroll(true);
        }, 100);
      }

      // Handle seeded chat
      if (
        newMessageHistory.length === 1 &&
        newMessageHistory[0] !== undefined &&
        !submitOnLoadPerformed.current &&
        searchParams?.get(SEARCH_PARAM_NAMES.SEEDED) === "true"
      ) {
        submitOnLoadPerformed.current = true;
        const seededMessage = newMessageHistory[0].message;
        await onSubmit({
          isSeededChat: true,
          messageOverride: seededMessage,
        });
        
        if (!chatSession.description) {
          await nameChatSession(sessionId);
          refreshChatSessions();
        }
      } else if (newMessageHistory.length === 2 && !chatSession.description) {
        await nameChatSession(sessionId);
        refreshChatSessions();
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    } finally {
      setIsFetchingChatMessages(false);
    }
  }, [
    setSelectedAssistantFromId,
    currentChatAnswering,
    updateCompleteMessageDetail,
    hasPerformedInitialScroll,
    clientScrollToBottom,
    searchParams,
    onSubmit,
    refreshChatSessions
  ]);

  const createNewSession = useCallback(async () => {
    setIsFetchingChatMessages(false);
    
    if (defaultAssistantId !== undefined) {
      setSelectedAssistantFromId(defaultAssistantId);
    } else {
      setSelectedAssistant(undefined);
    }
    
    updateCompleteMessageDetail(null, new Map());
    setChatSessionSharedStatus(ChatSessionSharedStatus.Private);

    // Handle submit on load
    if (shouldSubmitOnLoad(searchParams) && !submitOnLoadPerformed.current) {
      submitOnLoadPerformed.current = true;
      await onSubmit();
    }
  }, [
    defaultAssistantId,
    setSelectedAssistantFromId,
    updateCompleteMessageDetail,
    searchParams,
    onSubmit
  ]);

  const switchSession = useCallback((sessionId: string | null) => {
    const priorChatSessionId = chatSessionIdRef.current;
    const loadedSessionId = loadedIdSessionRef.current;
    
    chatSessionIdRef.current = sessionId;
    loadedIdSessionRef.current = sessionId;
    setExistingChatSessionId(sessionId);

    // Reset scroll state for new sessions
    if (sessionId !== null) {
      setHasPerformedInitialScroll(false);
    }
  }, []);

  const updateSessionSharedStatus = useCallback((status: ChatSessionSharedStatus) => {
    setChatSessionSharedStatus(status);
  }, []);

  // Effect to handle session changes
  useEffect(() => {
    const sessionId = searchParams?.get('chatId') || null;
    switchSession(sessionId);
  }, [searchParams, switchSession]);

  // Effect to load session data
  useEffect(() => {
    if (existingChatSessionId === null) {
      createNewSession();
    } else {
      loadChatSession(existingChatSessionId);
    }
  }, [existingChatSessionId, createNewSession, loadChatSession]);

  return {
    existingChatSessionId,
    isFetchingChatMessages,
    chatSessionSharedStatus,
    hasPerformedInitialScroll,
    submitOnLoadPerformed,
    maxTokens,
    loadChatSession,
    createNewSession,
    switchSession,
    updateSessionSharedStatus,
    selectedAssistant,
    setSelectedAssistant,
    setSelectedAssistantFromId,
    setHasPerformedInitialScroll,
    scrollInitialized,
    selectedMessageForDocDisplay,
    setSelectedMessageForDocDisplay,
    fetchMaxTokens,
    handleSlackChatRedirect,
    calculateTokensAndUpdateSearchMode,
  };
} 