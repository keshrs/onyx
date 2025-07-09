import { ChatInputBar } from "../input/ChatInputBar";
import { useDocumentsContext } from "../my-documents/DocumentsContext";
import { useUser } from "@/components/user/UserProvider";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { useContext } from "react";
import { LlmDescriptor } from "@/lib/hooks";
import { Persona } from "../../admin/assistants/interfaces";
import { OnyxDocument } from "@/lib/search/interfaces";
import { SourceMetadata } from "@/lib/search/interfaces";
import { DocumentSet, Tag } from "@/lib/types";
import { FilterManager } from "@/lib/hooks";
import MinimalMarkdown from "@/components/chat/MinimalMarkdown";
import { useChatInput } from "../hooks/useChatInput";
import { useChatState } from "../hooks/useChatState";
import { useChatUI } from "../hooks/useChatUI";

// Type definitions to avoid React import issues
type ReactRefObject<T> = {
  current: T | null;
};

export interface ChatInputAreaProps {
  // Core input functionality
  message: string;
  setMessage: (message: string) => void;
  onSubmit: (params?: {
    messageIdToResend?: number;
    messageOverride?: string;
    queryOverride?: string;
    forceSearch?: boolean;
    isSeededChat?: boolean;
    alternativeAssistantOverride?: Persona | null;
    modelOverride?: LlmDescriptor;
    regenerationRequest?: any;
    overrideFileDescriptors?: any[];
  }) => Promise<void>;
  stopGenerating: () => void;
  
  // Assistant management
  selectedAssistant: Persona;
  alternativeAssistant: Persona | null;
  setAlternativeAssistant: (assistant: Persona | null) => void;
  
  // Document and file management
  selectedDocuments: OnyxDocument[];
  clearSelectedDocuments: () => void;
  handleFileUpload: (files: File[]) => Promise<void>;
  
  // UI state
  chatState: string;
  retrievalEnabled: boolean;
  proSearchEnabled: boolean;
  setProSearchEnabled: (enabled: boolean) => void;
  
  // External dependencies (will be replaced by hooks in refactor)
  llmManager: any;
  filterManager: FilterManager;
  availableSources: SourceMetadata[];
  availableDocumentSets: DocumentSet[];
  availableTags: Tag[];
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  
  // Modal triggers
  showApiKeyModal: () => void;
  showFilePicker: () => void;
  toggleDocumentSidebar: () => void;
}

export function ChatInputArea({
  message,
  setMessage,
  onSubmit,
  stopGenerating,
  selectedAssistant,
  alternativeAssistant,
  setAlternativeAssistant,
  selectedDocuments,
  clearSelectedDocuments,
  handleFileUpload,
  chatState,
  retrievalEnabled,
  proSearchEnabled,
  setProSearchEnabled,
  llmManager,
  filterManager,
  availableSources,
  availableDocumentSets,
  availableTags,
  textAreaRef,
  showApiKeyModal,
  showFilePicker,
  toggleDocumentSidebar,
}: ChatInputAreaProps) {
  const { user } = useUser();
  const settings = useContext(SettingsContext);
  const { currentMessageFiles, setCurrentMessageFiles } = useDocumentsContext();
  
  // Note: Our custom hooks require parameters that aren't available in this component yet
  // They will be properly integrated during the main component refactor
  // For now, we'll use the existing hooks and prepare for future integration
  
  // Enhanced file upload with service integration
  const handleFileUploadWithService = async (files: File[]) => {
    try {
      await handleFileUpload(files);
      // TODO: Integrate with chatInput.handleMessageSpecificFileUpload during main refactor
    } catch (error) {
      console.error("File upload failed:", error);
      // TODO: Integrate with chatUI error handling during main refactor
    }
  };

  // Enhanced message submission with service integration
  const handleSubmit = async () => {
    try {
      await onSubmit();
      // TODO: Integrate with chatInput.resetInputBar during main refactor
    } catch (error) {
      console.error("Message submission failed:", error);
      // TODO: Integrate with chatUI error handling during main refactor
    }
  };

  // Enhanced input change handler with service integration
  const handleInputChange = (newMessage: string) => {
    setMessage(newMessage);
    // TODO: Integrate with chatInput.setMessage during main refactor
  };

  return (
    <div className="pointer-events-auto w-[95%] mx-auto relative mb-8">
      <ChatInputBar
        // Core input props
        message={message}
        setMessage={setMessage}
        onSubmit={handleSubmit}
        stopGenerating={stopGenerating}
        textAreaRef={textAreaRef}
        
        // Assistant props
        selectedAssistant={selectedAssistant}
        alternativeAssistant={alternativeAssistant}
        setAlternativeAssistant={setAlternativeAssistant}
        
        // Document and file props
        selectedDocuments={selectedDocuments}
        removeDocs={clearSelectedDocuments}
        setFiles={setCurrentMessageFiles}
        handleFileUpload={handleFileUploadWithService}
        
        // UI state props
        chatState={chatState as any}
        retrievalEnabled={retrievalEnabled}
        proSearchEnabled={proSearchEnabled}
        setProSearchEnabled={setProSearchEnabled}
        
        // External dependencies
        llmManager={llmManager}
        filterManager={filterManager}
        availableSources={availableSources}
        availableDocumentSets={availableDocumentSets}
        availableTags={availableTags}
        
        // Modal triggers
        showConfigureAPIKey={showApiKeyModal}
        toggleDocSelection={showFilePicker}
        toggleDocumentSidebar={toggleDocumentSidebar}
      />
      
      {/* Enterprise settings disclaimer */}
      {settings?.enterpriseSettings?.custom_lower_disclaimer_content && (
        <div className="mobile:hidden mt-4 flex items-center justify-center relative w-[95%] mx-auto">
          <div className="text-sm text-text-500 max-w-searchbar-max px-4 text-center">
            <MinimalMarkdown
              content={settings.enterpriseSettings.custom_lower_disclaimer_content}
            />
          </div>
        </div>
      )}
      
      {/* Enterprise logotype */}
      {settings?.enterpriseSettings?.use_custom_logotype && (
        <div className="hidden lg:block absolute right-0 bottom-0">
          <img
            src="/api/enterprise-settings/logotype"
            alt="logotype"
            style={{ objectFit: "contain" }}
            className="w-fit h-8"
          />
        </div>
      )}
    </div>
  );
} 