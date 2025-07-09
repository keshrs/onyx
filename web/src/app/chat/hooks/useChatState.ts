import { useState, useCallback, useRef } from 'react';
import { ChatState, RegenerationState } from '../types';
import { Message } from '../interfaces';

export interface ChatStateManager {
  // Chat state
  chatState: Map<string | null, ChatState>;
  updateChatState: (newState: ChatState, sessionId?: string | null) => void;
  currentChatState: (sessionId: string) => ChatState;
  currentChatAnswering: (sessionId: string) => boolean;
  
  // Regeneration state
  regenerationState: Map<string | null, RegenerationState | null>;
  updateRegenerationState: (newState: RegenerationState | null, sessionId?: string | null) => void;
  resetRegenerationState: (sessionId?: string | null) => void;
  currentRegenerationState: (sessionId: string) => RegenerationState | null;
  
  // Continue state
  canContinue: Map<string | null, boolean>;
  updateCanContinue: (newState: boolean, sessionId?: string | null) => void;
  currentCanContinue: (sessionId: string) => boolean;
  
  // Session tracking
  sessionHasSentLocalUserMessage: Map<string | null, boolean>;
  markSessionMessageSent: (sessionId: string | null) => void;
  currentSessionHasSentLocalUserMessage: (sessionId: string | null) => boolean;
  
  // Abort controllers
  abortControllers: Map<string | null, AbortController>;
  setAbortControllers: (controllers: Map<string | null, AbortController>) => void;
  addAbortController: (sessionId: string, controller: AbortController) => void;
  removeAbortController: (sessionId: string) => void;
  
  // Streaming control
  stopGenerating: (currentSessionId: () => string, messageHistory: Message[], messageManager: any) => void;
  continueGenerating: (onSubmit: (params: any) => Promise<void>) => void;
  
  // Session management
  updateStatesWithNewSessionId: (newSessionId: string, messageManager: any) => void;
  
  // Alternative assistant tracking
  alternativeGeneratingAssistant: any;
  setAlternativeGeneratingAssistant: (assistant: any) => void;
}

export function useChatState(): ChatStateManager {
  const [chatState, setChatState] = useState<Map<string | null, ChatState>>(
    new Map([[null, "input"]])
  );
  
  const [regenerationState, setRegenerationState] = useState<
    Map<string | null, RegenerationState | null>
  >(new Map([[null, null]]));
  
  const [canContinue, setCanContinue] = useState<Map<string | null, boolean>>(
    new Map([[null, false]])
  );
  
  const [sessionHasSentLocalUserMessage, setSessionHasSentLocalUserMessage] =
    useState<Map<string | null, boolean>>(new Map());
    
  const [abortControllers, setAbortControllers] = useState<
    Map<string | null, AbortController>
  >(new Map());
    
  const [alternativeGeneratingAssistant, setAlternativeGeneratingAssistant] = 
    useState<any>(null);

  const updateChatState = useCallback((newState: ChatState, sessionId?: string | null) => {
    setChatState((prevState) => {
      const newChatState = new Map(prevState);
      newChatState.set(sessionId !== undefined ? sessionId : null, newState);
      return newChatState;
    });
  }, []);

  const currentChatState = useCallback((sessionId: string): ChatState => {
    return chatState.get(sessionId) || "input";
  }, [chatState]);

  const currentChatAnswering = useCallback((sessionId: string) => {
    const state = currentChatState(sessionId);
    return state === "toolBuilding" || state === "streaming" || state === "loading";
  }, [currentChatState]);

  const updateRegenerationState = useCallback((
    newState: RegenerationState | null,
    sessionId?: string | null
  ) => {
    setRegenerationState((prevState) => {
      const newRegenerationState = new Map(prevState);
      newRegenerationState.set(
        sessionId !== undefined && sessionId != null ? sessionId : null,
        newState
      );
      return newRegenerationState;
    });
  }, []);

  const resetRegenerationState = useCallback((sessionId?: string | null) => {
    updateRegenerationState(null, sessionId);
  }, [updateRegenerationState]);

  const currentRegenerationState = useCallback((sessionId: string): RegenerationState | null => {
    return regenerationState.get(sessionId) || null;
  }, [regenerationState]);

  const updateCanContinue = useCallback((newState: boolean, sessionId?: string | null) => {
    setCanContinue((prevState) => {
      const newCanContinueState = new Map(prevState);
      newCanContinueState.set(sessionId !== undefined ? sessionId : null, newState);
      return newCanContinueState;
    });
  }, []);

  const currentCanContinue = useCallback((sessionId: string): boolean => {
    return canContinue.get(sessionId) || false;
  }, [canContinue]);

  const markSessionMessageSent = useCallback((sessionId: string | null) => {
    setSessionHasSentLocalUserMessage((prev) => {
      const newMap = new Map(prev);
      newMap.set(sessionId, true);
      return newMap;
    });
  }, []);

  const currentSessionHasSentLocalUserMessage = useCallback((sessionId: string | null) => {
    return sessionHasSentLocalUserMessage.size === 0
      ? undefined
      : sessionHasSentLocalUserMessage.get(sessionId) || false;
  }, [sessionHasSentLocalUserMessage]);

  const addAbortController = useCallback((sessionId: string, controller: AbortController) => {
    setAbortControllers((prev) => {
      const newControllers = new Map(prev);
      newControllers.set(sessionId, controller);
      return newControllers;
    });
  }, []);

  const removeAbortController = useCallback((sessionId: string) => {
    setAbortControllers((prev) => {
      const newControllers = new Map(prev);
      newControllers.delete(sessionId);
      return newControllers;
    });
  }, []);

  const stopGenerating = useCallback((
    currentSessionId: () => string, 
    messageHistory: Message[], 
    messageManager: any
  ) => {
    const currentSession = currentSessionId();
    const controller = abortControllers.get(currentSession);
    if (controller) {
      controller.abort();
      removeAbortController(currentSession);
    }

    const lastMessage = messageHistory[messageHistory.length - 1];
    if (
      lastMessage &&
      lastMessage.type === "assistant" &&
      lastMessage.toolCall &&
      lastMessage.toolCall.tool_result === undefined
    ) {
      const newCompleteMessageMap = new Map(
        messageManager.currentMessageMap(currentSessionId())
      );
      const updatedMessage = { ...lastMessage, toolCall: null };
      newCompleteMessageMap.set(lastMessage.messageId, updatedMessage);
      messageManager.updateCompleteMessageDetail(currentSession, newCompleteMessageMap);
    }

    updateChatState("input", currentSession);
  }, [abortControllers, removeAbortController, updateChatState]);

  const continueGenerating = useCallback((onSubmit: (params: any) => Promise<void>) => {
    onSubmit({
      messageOverride: "Continue Generating (pick up exactly where you left off)",
    });
  }, []);

  const updateStatesWithNewSessionId = useCallback((newSessionId: string, messageManager: any) => {
    // Update abort controllers
    setAbortControllers((prevState) => {
      const newState = new Map(prevState);
      const existingState = newState.get(null);
      if (existingState !== undefined) {
        newState.set(newSessionId, existingState);
        newState.delete(null);
      }
      return newState;
    });

    // Update message manager
    messageManager.updateStatesWithNewSessionId(newSessionId);

    // Update other state maps
    setChatState((prevState) => {
      const newState = new Map(prevState);
      const existingState = newState.get(null);
      if (existingState !== undefined) {
        newState.set(newSessionId, existingState);
        newState.delete(null);
      }
      return newState;
    });

    setRegenerationState((prevState) => {
      const newState = new Map(prevState);
      const existingState = newState.get(null);
      if (existingState !== undefined) {
        newState.set(newSessionId, existingState);
        newState.delete(null);
      }
      return newState;
    });

    setCanContinue((prevState) => {
      const newState = new Map(prevState);
      const existingState = newState.get(null);
      if (existingState !== undefined) {
        newState.set(newSessionId, existingState);
        newState.delete(null);
      }
      return newState;
    });

    setSessionHasSentLocalUserMessage((prevState) => {
      const newState = new Map(prevState);
      const existingState = newState.get(null);
      if (existingState !== undefined) {
        newState.set(newSessionId, existingState);
        newState.delete(null);
      }
      return newState;
    });
  }, []);

  return {
    chatState,
    updateChatState,
    currentChatState,
    currentChatAnswering,
    regenerationState,
    updateRegenerationState,
    resetRegenerationState,
    currentRegenerationState,
    canContinue,
    updateCanContinue,
    currentCanContinue,
    sessionHasSentLocalUserMessage,
    markSessionMessageSent,
    currentSessionHasSentLocalUserMessage,
    abortControllers,
    setAbortControllers,
    addAbortController,
    removeAbortController,
    stopGenerating,
    continueGenerating,
    updateStatesWithNewSessionId,
    alternativeGeneratingAssistant,
    setAlternativeGeneratingAssistant,
  };
} 