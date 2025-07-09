import React from 'react';
import { Message } from '../interfaces';
import { HumanMessage, AIMessage } from '../message/Messages';
import { AgenticMessage } from '../message/AgenticMessage';
import { ErrorBanner } from '../message/Resubmit';
import { Persona } from '../../admin/assistants/interfaces';
import { MinimalOnyxDocument } from '@/lib/search/interfaces';

interface MessageListProps {
  messages: Message[];
  currentSessionId: string;
  currentChatState: string;
  currentRegenerationState: any;
  messageMap: Map<number, Message>;
  
  // Actions
  setPresentingDocument: (document: MinimalOnyxDocument) => void;
  stopGenerating: () => void;
  onSubmit: (params: any) => void;
  updateCompleteMessageDetail: (sessionId: string, messageMap: Map<number, Message>) => void;
  setSelectedMessageForDocDisplay: (messageId: number | null) => void;
  setMessageAsLatest: (messageId: number) => void;
  handleResubmitLastMessage: () => void;
  continueGenerating?: () => void;
  currentCanContinue: (sessionId: string) => boolean;
  toggleDocumentSidebar: () => void;
  documentSidebarVisible: boolean;
  selectedMessageForDocDisplay: number | null;
  
  // Context
  liveAssistant: Persona | undefined;
  alternativeAssistant: Persona | null;
  alternativeGeneratingAssistant: Persona | null;
  availableAssistants: Persona[];
  allUserFiles: any[];
  
  // State
  uncaughtError: string | null;
  submittedMessage: string;
  loadingError: string | null;
  
  // Refs
  lastMessageRef: React.RefObject<HTMLDivElement>;
  
  // Document selection
  selectedDocuments: any[];
  clearSelectedDocuments: () => void;
  toggleDocumentSelection: (document: any) => void;
}

export function MessageList({
  messages,
  currentSessionId,
  currentChatState,
  currentRegenerationState,
  messageMap,
  setPresentingDocument,
  stopGenerating,
  onSubmit,
  updateCompleteMessageDetail,
  setSelectedMessageForDocDisplay,
  setMessageAsLatest,
  handleResubmitLastMessage,
  continueGenerating,
  currentCanContinue,
  toggleDocumentSidebar,
  documentSidebarVisible,
  selectedMessageForDocDisplay,
  liveAssistant,
  alternativeAssistant,
  alternativeGeneratingAssistant,
  availableAssistants,
  allUserFiles,
  uncaughtError,
  submittedMessage,
  loadingError,
  lastMessageRef,
  selectedDocuments,
  clearSelectedDocuments,
  toggleDocumentSelection,
}: MessageListProps) {
  const SYSTEM_MESSAGE_ID = -3;

  const renderMessage = (message: Message, index: number) => {
    const messageReactComponentKey = `${index}-${currentSessionId}`;
    const parentMessage = message.parentMessageId
      ? messageMap.get(message.parentMessageId)
      : null;

    // Skip messages based on regeneration state
    if (
      currentRegenerationState?.finalMessageIndex &&
      currentRegenerationState?.finalMessageIndex < message.messageId
    ) {
      return null;
    }

    if (message.type === "user") {
      // Skip user messages during loading or regeneration
      if (
        (currentChatState === "loading" && index === messages.length - 1) ||
        (currentRegenerationState?.regenerating &&
          message.messageId >= currentRegenerationState?.finalMessageIndex)
      ) {
        return null;
      }

      const nextMessage = messages.length > index + 1 ? messages[index + 1] : null;

      return (
        <div
          id={`message-${message.messageId}`}
          key={messageReactComponentKey}
        >
          <HumanMessage
            setPresentingDocument={setPresentingDocument}
            disableSwitchingForStreaming={
              (nextMessage && nextMessage.is_generating) || false
            }
            stopGenerating={stopGenerating}
            content={message.message}
            files={message.files}
            messageId={message.messageId}
            onEdit={(editedContent) => {
              const parentMessageId = message.parentMessageId!;
              const parentMessage = messageMap.get(parentMessageId)!;
              const newMessageMap = new Map(messageMap);
              newMessageMap.set(parentMessageId, {
                ...parentMessage,
                latestChildMessageId: null,
              });
              updateCompleteMessageDetail(currentSessionId, newMessageMap);
              onSubmit({
                messageIdToResend: message.messageId || undefined,
                messageOverride: editedContent,
              });
            }}
            otherMessagesCanSwitchTo={parentMessage?.childrenMessageIds || []}
            onMessageSelection={(messageId) => {
              const newMessageMap = new Map(messageMap);
              const parent = newMessageMap.get(message.parentMessageId!);
              if (parent) {
                parent.latestChildMessageId = messageId;
              }
              updateCompleteMessageDetail(currentSessionId, newMessageMap);
              setSelectedMessageForDocDisplay(messageId);
              setMessageAsLatest(messageId);
            }}
          />
        </div>
      );
    } else if (message.type === "assistant") {
      // Skip assistant messages during loading or regeneration
      if (
        (currentChatState === "loading" && index > messages.length - 1) ||
        (currentRegenerationState?.regenerating &&
          message.messageId > currentRegenerationState?.finalMessageIndex)
      ) {
        return null;
      }

      // Skip nested assistant messages
      if (parentMessage?.type === "assistant") {
        return null;
      }

      const previousMessage = index !== 0 ? messages[index - 1] : null;
      const currentAlternativeAssistant =
        message.alternateAssistantID != null
          ? availableAssistants.find(
              (persona) => persona.id === message.alternateAssistantID
            )
          : null;

      const secondLevelMessage =
        messages[index + 1]?.type === "assistant" ? messages[index + 1] : undefined;

      const attachedFileDescriptors = previousMessage?.files.filter(
        (file) => file.type === "USER_KNOWLEDGE"
      );
      const userFiles = allUserFiles?.filter((file) =>
        attachedFileDescriptors?.some(
          (descriptor) => descriptor.id === file.file_id
        )
      );

      return (
        <div
          className="text-text"
          id={`message-${message.messageId}`}
          key={messageReactComponentKey}
          ref={index === messages.length - 1 ? lastMessageRef : null}
        >
          {message.is_agentic ? (
            <AgenticMessage
              resubmit={handleResubmitLastMessage}
              error={uncaughtError}
              isStreamingQuestions={message.isStreamingQuestions ?? false}
              isGenerating={message.is_generating ?? false}
              docSidebarToggled={
                documentSidebarVisible &&
                (selectedMessageForDocDisplay === message.messageId ||
                  selectedMessageForDocDisplay === secondLevelMessage?.messageId)
              }
              secondLevelGenerating={
                (message.second_level_generating && currentChatState !== "input") || false
              }
              secondLevelSubquestions={message.sub_questions?.filter(
                (subQuestion) => subQuestion.level === 1
              )}
              secondLevelAssistantMessage={message.second_level_message}
              subQuestions={
                message.sub_questions?.filter((subQuestion) => subQuestion.level === 0) || []
              }
              agenticDocs={message.agentic_docs}
              docs={message?.documents && message?.documents.length > 0
                ? message?.documents
                : parentMessage?.documents}
              setPresentingDocument={setPresentingDocument}
              continueGenerating={
                index === messages.length - 1 && currentCanContinue(currentSessionId)
                  ? continueGenerating
                  : undefined
              }
              overriddenModel={message.overridden_model}
              regenerate={() => {
                // This would need to be implemented
              }}
              otherMessagesCanSwitchTo={parentMessage?.childrenMessageIds || []}
              onMessageSelection={(messageId) => {
                const newMessageMap = new Map(messageMap);
                const parent = newMessageMap.get(message.parentMessageId!);
                if (parent) {
                  parent.latestChildMessageId = messageId;
                }
                updateCompleteMessageDetail(currentSessionId, newMessageMap);
                setSelectedMessageForDocDisplay(messageId);
                setMessageAsLatest(messageId);
              }}
              isActive={messages.length - 1 === index || messages.length - 2 === index}
              toggleDocumentSelection={(second: boolean) => {
                if (
                  (!second && !documentSidebarVisible) ||
                  (documentSidebarVisible &&
                    selectedMessageForDocDisplay === message.messageId)
                ) {
                  toggleDocumentSidebar();
                }
                setSelectedMessageForDocDisplay(
                  second ? secondLevelMessage?.messageId || null : message.messageId
                );
              }}
              currentPersona={liveAssistant}
              alternativeAssistant={currentAlternativeAssistant}
              messageId={message.messageId}
              content={message.message}
              files={message.files}
              query={message.query}
              citedDocuments={[]} // This would need to be calculated
              toolCall={message.toolCall}
              isComplete={
                index !== messages.length - 1 ||
                (currentChatState !== "streaming" && currentChatState !== "toolBuilding")
              }
              handleFeedback={() => {
                // This would need to be implemented
              }}
            />
          ) : (
            <AIMessage
              userKnowledgeFiles={userFiles}
              docs={
                message?.documents && message?.documents.length > 0
                  ? message?.documents
                  : parentMessage?.documents
              }
              setPresentingDocument={setPresentingDocument}
              index={index}
              continueGenerating={
                index === messages.length - 1 && currentCanContinue(currentSessionId)
                  ? continueGenerating
                  : undefined
              }
              overriddenModel={message.overridden_model}
              regenerate={() => {
                // This would need to be implemented
              }}
              otherMessagesCanSwitchTo={parentMessage?.childrenMessageIds || []}
              onMessageSelection={(messageId) => {
                const newMessageMap = new Map(messageMap);
                const parent = newMessageMap.get(message.parentMessageId!);
                if (parent) {
                  parent.latestChildMessageId = messageId;
                }
                updateCompleteMessageDetail(currentSessionId, newMessageMap);
                setSelectedMessageForDocDisplay(messageId);
                setMessageAsLatest(messageId);
              }}
              isActive={messages.length - 1 === index}
              selectedDocuments={selectedDocuments}
              toggleDocumentSelection={() => {
                if (
                  !documentSidebarVisible ||
                  (documentSidebarVisible &&
                    selectedMessageForDocDisplay === message.messageId)
                ) {
                  toggleDocumentSidebar();
                }
                setSelectedMessageForDocDisplay(message.messageId);
              }}
              currentPersona={liveAssistant}
              alternativeAssistant={currentAlternativeAssistant}
              messageId={message.messageId}
              content={message.message}
              files={message.files}
              query={message.query}
              citedDocuments={[]} // This would need to be calculated
              toolCall={message.toolCall}
              isComplete={
                index !== messages.length - 1 ||
                (currentChatState !== "streaming" && currentChatState !== "toolBuilding")
              }
              hasDocs={(message.documents && message.documents.length > 0) === true}
              handleFeedback={() => {
                // This would need to be implemented
              }}
              handleSearchQueryEdit={
                index === messages.length - 1 && currentChatState === "input"
                  ? (newQuery) => {
                      if (!previousMessage) {
                        // Show error popup
                        return;
                      }
                      onSubmit({
                        messageIdToResend: previousMessage.messageId,
                        queryOverride: newQuery,
                        alternativeAssistantOverride: currentAlternativeAssistant,
                      });
                    }
                  : undefined
              }
              handleForceSearch={() => {
                if (previousMessage && previousMessage.messageId) {
                  // Implement force search
                } else {
                  // Show error popup
                }
              }}
              retrievalDisabled={!currentAlternativeAssistant}
            />
          )}
        </div>
      );
    } else {
      // Error message
      return (
        <div key={messageReactComponentKey}>
          <AIMessage
            setPresentingDocument={setPresentingDocument}
            currentPersona={liveAssistant}
            messageId={message.messageId}
            content={
              <ErrorBanner
                resubmit={handleResubmitLastMessage}
                error={message.message}
                showStackTrace={undefined}
              />
            }
          />
        </div>
      );
    }
  };

  return (
    <>
      {messages.map(renderMessage)}
      
      {/* Loading states */}
      {(currentChatState === "loading" ||
        (loadingError &&
          !currentRegenerationState?.regenerating &&
          messages[messages.length - 1]?.type !== "user")) && (
        <HumanMessage
          setPresentingDocument={setPresentingDocument}
          messageId={-1}
          content={submittedMessage}
        />
      )}

      {currentChatState === "loading" && (
        <div key={`${messages.length}-${currentSessionId}`}>
          <AIMessage
            setPresentingDocument={setPresentingDocument}
            currentPersona={liveAssistant}
            alternativeAssistant={alternativeGeneratingAssistant ?? alternativeAssistant}
            messageId={null}
            content={
              <div className="mr-auto relative inline-block">
                <span className="text-sm loading-text">Thinking...</span>
              </div>
            }
          />
        </div>
      )}

      {loadingError && (
        <div key={-1}>
          <AIMessage
            setPresentingDocument={setPresentingDocument}
            currentPersona={liveAssistant}
            messageId={-1}
            content={
              <p className="text-red-700 text-sm my-auto">{loadingError}</p>
            }
          />
        </div>
      )}
    </>
  );
} 