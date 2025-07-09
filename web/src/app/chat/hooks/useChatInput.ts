import { useState, useRef, useCallback, useMemo } from 'react';
import { FileDescriptor, ChatFileType } from '../interfaces';
import { useDocumentsContext } from '../my-documents/DocumentsContext';

export interface ChatInputManager {
  // Input state
  message: string;
  currentMessageFiles: FileDescriptor[];
  submittedMessage: string;
  
  // Input operations
  setMessage: (message: string) => void;
  setSubmittedMessage: (message: string) => void;
  setCurrentMessageFiles: (files: FileDescriptor[]) => void;
  resetInputBar: () => void;
  reset: () => void;
  
  // File handling
  handleMessageSpecificFileUpload: (acceptedFiles: File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  
  // Input validation
  canSubmit: boolean;
  isUploading: boolean;
  
  // Refs
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  inputRef: React.RefObject<HTMLDivElement>;
  endPaddingRef: React.RefObject<HTMLDivElement>;
}

export function useChatInput(
  maxTokens: number,
  selectedDocumentTokens: number,
  setSelectedFiles: (files: any[]) => void,
  llmAcceptsImages: boolean,
  setPopup: (popup: any) => void,
  updateChatState: (state: string, sessionId?: string) => void,
  currentSessionId: () => string,
  // Additional parameters for reset function
  clearSelectedItems: () => void,
  setLoadingError: (error: string | null) => void
): ChatInputManager {
  const [message, setMessage] = useState("");
  const [currentMessageFiles, setCurrentMessageFiles] = useState<FileDescriptor[]>([]);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const endPaddingRef = useRef<HTMLDivElement>(null);
  
  const { uploadFile } = useDocumentsContext();

  const resetInputBar = useCallback(() => {
    setMessage("");
    setCurrentMessageFiles([]);

    // Reset selectedFiles if they're under the context limit, but preserve selectedFolders.
    // If under the context limit, the files will be included in the chat history
    // so we don't need to keep them around.
    if (selectedDocumentTokens < maxTokens) {
      setSelectedFiles([]);
    }

    if (endPaddingRef.current) {
      endPaddingRef.current.style.height = `95px`;
    }
  }, [selectedDocumentTokens, maxTokens, setSelectedFiles]);

  const reset = useCallback(() => {
    setMessage("");
    setCurrentMessageFiles([]);
    clearSelectedItems();
    setLoadingError(null);
  }, [clearSelectedItems, setLoadingError]);

  const handleMessageSpecificFileUpload = useCallback(async (acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length > 0 && !llmAcceptsImages) {
      setPopup({
        type: "error",
        message:
          "The current model does not support image input. Please select a model with Vision support.",
      });
      return;
    }

    updateChatState("uploading", currentSessionId());
    setIsUploading(true);

    try {
      for (let file of acceptedFiles) {
        const formData = new FormData();
        formData.append("files", file);
        const response = await uploadFile(formData, null);

        if (response.length > 0 && response[0] !== undefined) {
          const uploadedFile = response[0];

          const newFileDescriptor: FileDescriptor = {
            // Use file_id (storage ID) if available, otherwise fallback to DB id
            // Ensure it's a string as FileDescriptor expects
            id: uploadedFile.file_id
              ? String(uploadedFile.file_id)
              : String(uploadedFile.id),
            type: uploadedFile.chat_file_type
              ? uploadedFile.chat_file_type
              : ChatFileType.PLAIN_TEXT,
            name: uploadedFile.name,
            isUploading: false, // Mark as successfully uploaded
          };

          setCurrentMessageFiles((prev) => [...prev, newFileDescriptor]);
        } else {
          setPopup({
            type: "error",
            message: "Failed to upload file",
          });
        }
      }
    } catch (error) {
      setPopup({
        type: "error",
        message: "Failed to upload file",
      });
    } finally {
      setIsUploading(false);
      updateChatState("input", currentSessionId());
    }
  }, [
    llmAcceptsImages,
    setPopup,
    updateChatState,
    currentSessionId,
    uploadFile
  ]);

  const removeFile = useCallback((fileId: string) => {
    setCurrentMessageFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const canSubmit = useMemo(() => {
    return message.trim().length > 0 || currentMessageFiles.length > 0;
  }, [message, currentMessageFiles]);

  return {
    message,
    currentMessageFiles,
    submittedMessage,
    setMessage,
    setSubmittedMessage,
    setCurrentMessageFiles,
    resetInputBar,
    reset,
    handleMessageSpecificFileUpload,
    removeFile,
    canSubmit,
    isUploading,
    textAreaRef,
    inputRef,
    endPaddingRef,
  };
} 