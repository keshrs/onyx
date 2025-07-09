import React from "react";
import { ApiKeyModal } from "@/components/llm/ApiKeyModal";
import { WelcomeModal } from "@/components/initialSetup/welcome/WelcomeModal";
import { FeedbackModal } from "../modal/FeedbackModal";
import { UserSettingsModal } from "../modal/UserSettingsModal";
import { FilePickerModal } from "../my-documents/components/FilePicker";
import { ChatSearchModal } from "../chat_search/ChatSearchModal";
import { Modal } from "@/components/Modal";
import { DocumentResults } from "../documentSidebar/DocumentResults";
import TextView from "@/components/chat/TextView";
import ExceptionTraceModal from "@/components/modals/ExceptionTraceModal";
import { ShareChatSessionModal } from "../modal/ShareChatSessionModal";
import AssistantModal from "../../assistants/mine/AssistantModal";
import { NoAssistantModal } from "@/components/modals/NoAssistantModal";
import { ChatSession, ChatSessionSharedStatus } from "../interfaces";
import { FeedbackType } from "../types";
import { MinimalOnyxDocument, OnyxDocument } from "@/lib/search/interfaces";
import { LlmDescriptor } from "@/lib/hooks";
import { Persona } from "../../admin/assistants/interfaces";

export interface ChatModalsProps {
  // Modal visibility states
  showApiKeyModal: boolean;
  shouldShowWelcomeModal: boolean;
  currentFeedback: [FeedbackType, number] | null;
  settingsToggled: boolean;
  userSettingsToggled: boolean;
  toggleDocSelection: boolean;
  isChatSearchModalOpen: boolean;
  presentingDocument: MinimalOnyxDocument | null;
  stackTraceModalContent: string | null;
  sharedChatSession: ChatSession | null;
  sharingModalVisible: boolean;
  showAssistantsModal: boolean;
  noAssistants: boolean;
  isAdmin: boolean;
  
  // Modal state setters
  setShowApiKeyModal: (show: boolean) => void;
  setCurrentFeedback: (feedback: [FeedbackType, number] | null) => void;
  setUserSettingsToggled: (toggled: boolean) => void;
  setSettingsToggled: (toggled: boolean) => void;
  setToggleDocSelection: (toggle: boolean) => void;
  setIsChatSearchModalOpen: (open: boolean) => void;
  setPresentingDocument: (document: MinimalOnyxDocument | null) => void;
  setStackTraceModalContent: (content: string | null) => void;
  setSharedChatSession: (session: ChatSession | null) => void;
  setSharingModalVisible: (visible: boolean) => void;
  setShowAssistantsModal: (show: boolean) => void;
  
  // Callbacks
  onFeedback: (messageId: number, feedbackType: FeedbackType, feedbackDetails: string, predefinedFeedback: string | undefined) => Promise<void>;
  setPopup: (popup: any) => void;
  updateCurrentLlm: (newLlm: LlmDescriptor) => void;
  setChatSessionSharedStatus: (status: ChatSessionSharedStatus) => void;
  
  // Data
  user: any;
  liveAssistant: Persona | undefined;
  llmManager: any;
  llmProviders: any;
  message: string;
  chatSessionSharedStatus: ChatSessionSharedStatus;
  chatSessionIdRef: React.MutableRefObject<string | null>;
  
  // Document sidebar related
  retrievalEnabled: boolean;
  documentSidebarVisible: boolean;
  settings: any;
  aiMessage: any;
  messageHistory: any[];
  humanMessage: any;
  selectedDocuments: OnyxDocument[];
  toggleDocumentSelection: (document: OnyxDocument) => void;
  clearSelectedDocuments: () => void;
  selectedDocumentTokens: number;
  maxTokens: number;
  innerSidebarElementRef: React.RefObject<HTMLDivElement>;
  setDocumentSidebarVisible: (visible: boolean) => void;
}

// TODO: clean up modal visibility/ toggle logic. They should be mutually exclusive.
//       When doing this, rename this file to ModalContainer, or something similar and refactor
export function ChatModals({
  // Modal visibility states
  showApiKeyModal,
  shouldShowWelcomeModal,
  currentFeedback,
  settingsToggled,
  userSettingsToggled,
  toggleDocSelection,
  isChatSearchModalOpen,
  presentingDocument,
  stackTraceModalContent,
  sharedChatSession,
  sharingModalVisible,
  showAssistantsModal,
  noAssistants,
  isAdmin,
  
  // Modal state setters
  setShowApiKeyModal,
  setCurrentFeedback,
  setUserSettingsToggled,
  setSettingsToggled,
  setToggleDocSelection,
  setIsChatSearchModalOpen,
  setPresentingDocument,
  setStackTraceModalContent,
  setSharedChatSession,
  setSharingModalVisible,
  setShowAssistantsModal,
  
  // Callbacks
  onFeedback,
  setPopup,
  updateCurrentLlm,
  setChatSessionSharedStatus,
  
  // Data
  user,
  liveAssistant,
  llmManager,
  llmProviders,
  message,
  chatSessionSharedStatus,
  chatSessionIdRef,
  
  // Document sidebar related
  retrievalEnabled,
  documentSidebarVisible,
  settings,
  aiMessage,
  messageHistory,
  humanMessage,
  selectedDocuments,
  toggleDocumentSelection,
  clearSelectedDocuments,
  selectedDocumentTokens,
  maxTokens,
  innerSidebarElementRef,
  setDocumentSidebarVisible,
}: ChatModalsProps) {
  return (
    <>
      {/* No Assistant Modal */}
      {noAssistants && (
        <NoAssistantModal isAdmin={isAdmin} />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && !shouldShowWelcomeModal && (
        <ApiKeyModal
          hide={() => setShowApiKeyModal(false)}
          setPopup={setPopup}
        />
      )}

      {/* Welcome Modal */}
      {shouldShowWelcomeModal && <WelcomeModal user={user} />}

      {/* Feedback Modal */}
      {currentFeedback && (
        <FeedbackModal
          feedbackType={currentFeedback[0]}
          onClose={() => setCurrentFeedback(null)}
          onSubmit={({ message, predefinedFeedback }) => {
            onFeedback(
              currentFeedback[1],
              currentFeedback[0],
              message,
              predefinedFeedback
            );
            setCurrentFeedback(null);
          }}
        />
      )}

      {/* User Settings Modal */}
      {(settingsToggled || userSettingsToggled) && (
        <UserSettingsModal
          setPopup={setPopup}
          setCurrentLlm={updateCurrentLlm}
          defaultModel={user?.preferences.default_model!}
          llmProviders={llmProviders}
          onClose={() => {
            setUserSettingsToggled(false);
            setSettingsToggled(false);
          }}
        />
      )}

      {/* File Picker Modal */}
      {toggleDocSelection && (
        <FilePickerModal
          setPresentingDocument={setPresentingDocument}
          buttonContent="Set as Context"
          isOpen={true}
          onClose={() => setToggleDocSelection(false)}
          onSave={() => {
            setToggleDocSelection(false);
          }}
        />
      )}

      {/* Chat Search Modal */}
      <ChatSearchModal
        open={isChatSearchModalOpen}
        onCloseModal={() => setIsChatSearchModalOpen(false)}
      />

      {/* Mobile Document Sidebar Modal */}
      {retrievalEnabled && documentSidebarVisible && settings?.isMobile && (
        <div className="md:hidden">
          <Modal
            hideDividerForTitle
            onOutsideClick={() => setDocumentSidebarVisible(false)}
            title="Sources"
          >
            <DocumentResults
              agenticMessage={
                aiMessage?.sub_questions?.length! > 0 ||
                messageHistory.find(
                  (m) => m.messageId === aiMessage?.parentMessageId
                )?.sub_questions?.length! > 0
                  ? true
                  : false
              }
              humanMessage={humanMessage ?? null}
              setPresentingDocument={setPresentingDocument}
              modal={true}
              ref={innerSidebarElementRef}
              closeSidebar={() => {
                setDocumentSidebarVisible(false);
              }}
              selectedMessage={aiMessage ?? null}
              selectedDocuments={selectedDocuments}
              toggleDocumentSelection={toggleDocumentSelection}
              clearSelectedDocuments={clearSelectedDocuments}
              selectedDocumentTokens={selectedDocumentTokens}
              maxTokens={maxTokens}
              initialWidth={400}
              isOpen={true}
              removeHeader
            />
          </Modal>
        </div>
      )}

      {/* Document Viewer Modal */}
      {presentingDocument && (
        <TextView
          presentingDocument={presentingDocument}
          onClose={() => setPresentingDocument(null)}
        />
      )}

      {/* Stack Trace Modal */}
      {stackTraceModalContent && (
        <ExceptionTraceModal
          onOutsideClick={() => setStackTraceModalContent(null)}
          exceptionTrace={stackTraceModalContent}
        />
      )}

      {/* Share Chat Session Modal (from shared session) */}
      {sharedChatSession && (
        <ShareChatSessionModal
          assistantId={liveAssistant?.id}
          message={message}
          modelOverride={llmManager.currentLlm}
          chatSessionId={sharedChatSession.id}
          existingSharedStatus={sharedChatSession.shared_status}
          onClose={() => setSharedChatSession(null)}
          onShare={(shared) =>
            setChatSessionSharedStatus(
              shared
                ? ChatSessionSharedStatus.Public
                : ChatSessionSharedStatus.Private
            )
          }
        />
      )}

      {/* Share Chat Session Modal (from current session) */}
      {sharingModalVisible && chatSessionIdRef.current !== null && (
        <ShareChatSessionModal
          message={message}
          assistantId={liveAssistant?.id}
          modelOverride={llmManager.currentLlm}
          chatSessionId={chatSessionIdRef.current}
          existingSharedStatus={chatSessionSharedStatus}
          onClose={() => setSharingModalVisible(false)}
        />
      )}

      {/* Assistants Modal */}
      {showAssistantsModal && (
        <AssistantModal hideModal={() => setShowAssistantsModal(false)} />
      )}
    </>
  );
} 