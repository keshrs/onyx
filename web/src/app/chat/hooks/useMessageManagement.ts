import { useState, useCallback } from 'react';
import { Message } from '../interfaces';
import { buildLatestMessageChain, processRawChatHistory, removeMessage, updateParentChildren } from '../lib';

export interface MessageManager {
  // Message state
  completeMessageDetail: Map<string | null, Map<number, Message>>;
  messageHistory: Message[];
  
  // Input message state
  message: string;
  setMessage: (message: string) => void;
  submittedMessage: string;
  setSubmittedMessage: (message: string) => void;
  
  // Message operations
  updateCompleteMessageDetail: (sessionId: string | null, messageMap: Map<number, Message>) => void;
  currentMessageMap: (sessionId: string | null) => Map<number, Message>;
  upsertToCompleteMessageMap: (params: {
    messages: Message[];
    completeMessageMapOverride?: Map<number, Message> | null;
    chatSessionId?: string;
    replacementsMap?: Map<number, number> | null;
    makeLatestChildMessage?: boolean;
  }) => { sessionId: string; messageMap: Map<number, Message> };
  
  // Session management
  updateStatesWithNewSessionId: (newSessionId: string) => void;
  
  // Message utilities
  resetMessageInput: () => void;
  resetSubmittedMessage: () => void;
  resetAllMessageState: () => void;
}

const SYSTEM_MESSAGE_ID = -3;

export function useMessageManagement(initialMessage?: string): MessageManager {
  const [completeMessageDetail, setCompleteMessageDetail] = useState<
    Map<string | null, Map<number, Message>>
  >(new Map());
    
  const [message, setMessage] = useState(initialMessage || "");
  const [submittedMessage, setSubmittedMessage] = useState(initialMessage || "");

  const updateCompleteMessageDetail = useCallback((
    sessionId: string | null,
    messageMap: Map<number, Message>
  ) => {
    setCompleteMessageDetail((prevState: Map<string | null, Map<number, Message>>) => {
      const newState = new Map(prevState);
      newState.set(sessionId, messageMap);
      return newState;
    });
  }, []);

  const currentMessageMap = useCallback((
    sessionId: string | null
  ): Map<number, Message> => {
    return completeMessageDetail.get(sessionId) || new Map<number, Message>();
  }, [completeMessageDetail]);

  const upsertToCompleteMessageMap = useCallback(({
    messages,
    completeMessageMapOverride,
    chatSessionId,
    replacementsMap = null,
    makeLatestChildMessage = false,
  }: {
    messages: Message[];
    completeMessageMapOverride?: Map<number, Message> | null;
    chatSessionId?: string;
    replacementsMap?: Map<number, number> | null;
    makeLatestChildMessage?: boolean;
  }) => {
    const frozenCompleteMessageMap = completeMessageMapOverride || currentMessageMap(chatSessionId || null);
    const newCompleteMessageMap = structuredClone(frozenCompleteMessageMap);

    if (messages[0] !== undefined && newCompleteMessageMap.size === 0) {
      const systemMessageId = messages[0].parentMessageId || SYSTEM_MESSAGE_ID;
      const firstMessageId = messages[0].messageId;
      const dummySystemMessage: Message = {
        messageId: systemMessageId,
        message: "",
        type: "system",
        files: [],
        toolCall: null,
        parentMessageId: null,
        childrenMessageIds: [firstMessageId],
        latestChildMessageId: firstMessageId,
      };
      newCompleteMessageMap.set(dummySystemMessage.messageId, dummySystemMessage);
      messages[0].parentMessageId = systemMessageId;
    }

    messages.forEach((message) => {
      const idToReplace = replacementsMap?.get(message.messageId);
      if (idToReplace) {
        removeMessage(idToReplace, newCompleteMessageMap);
      }

      // Update childrenMessageIds for the parent
      if (!newCompleteMessageMap.has(message.messageId) && message.parentMessageId !== null) {
        updateParentChildren(message, newCompleteMessageMap, true);
      }
      newCompleteMessageMap.set(message.messageId, message);
    });

    // If specified, make these new messages the latest of the current message chain
    if (makeLatestChildMessage) {
      const currentMessageChain = buildLatestMessageChain(frozenCompleteMessageMap);
      const latestMessage = currentMessageChain[currentMessageChain.length - 1];
      if (messages[0] !== undefined && latestMessage) {
        const latestMessageInMap = newCompleteMessageMap.get(latestMessage.messageId);
        if (latestMessageInMap) {
          latestMessageInMap.latestChildMessageId = messages[0].messageId;
        }
      }
    }

    const sessionId = chatSessionId || null;
    updateCompleteMessageDetail(sessionId, newCompleteMessageMap);

    return {
      sessionId,
      messageMap: newCompleteMessageMap,
    };
  }, [currentMessageMap, updateCompleteMessageDetail]);

  const updateStatesWithNewSessionId = useCallback((newSessionId: string) => {
    setCompleteMessageDetail((prevState: Map<string | null, Map<number, Message>>) => {
      const newState = new Map(prevState);
      const existingMessages = newState.get(null);
      if (existingMessages) {
        newState.set(newSessionId, existingMessages);
        newState.delete(null);
      }
      return newState;
    });
  }, []);

  const resetMessageInput = useCallback(() => {
    setMessage("");
  }, []);

  const resetSubmittedMessage = useCallback(() => {
    setSubmittedMessage("");
  }, []);

  const resetAllMessageState = useCallback(() => {
    setMessage("");
    setSubmittedMessage("");
  }, []);

  // Build message history from current session
  const messageHistory = buildLatestMessageChain(currentMessageMap(null));

  return {
    completeMessageDetail,
    messageHistory,
    message,
    setMessage,
    submittedMessage,
    setSubmittedMessage,
    updateCompleteMessageDetail,
    currentMessageMap,
    upsertToCompleteMessageMap,
    updateStatesWithNewSessionId,
    resetMessageInput,
    resetSubmittedMessage,
    resetAllMessageState,
  };
} 