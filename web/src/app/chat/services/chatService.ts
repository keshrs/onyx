import { handleChatFeedback, createChatSession, nameChatSession, SendMessageParams } from '../lib';
import { FeedbackType } from '../types';
import { ChatSession } from '../interfaces';

export interface ChatServiceInterface {
  // Session operations
  createChatSession(assistantId: number, name?: string): Promise<string>;
  nameChatSession(sessionId: string): Promise<void>;
  
  // Message operations
  sendMessage(params: SendMessageParams): Promise<void>;
  onSubmit(params: {
    messageIdToResend?: number;
    messageOverride?: string;
    queryOverride?: string;
    forceSearch?: boolean;
    isSeededChat?: boolean;
    alternativeAssistantOverride?: any;
    modelOverride?: any;
    regenerationRequest?: any;
    overrideFileDescriptors?: any[];
  }): Promise<void>;
  handleResubmitLastMessage(messageHistory: any[]): Promise<void>;
  handleFeedback(
    messageId: number,
    feedbackType: FeedbackType,
    feedbackDetails: string,
    predefinedFeedback?: string
  ): Promise<void>;
  
  // File operations
  uploadFiles(files: File[]): Promise<any[]>;
  
  // Token operations
  getTokenEstimate(fileIds: number[], folderIds: number[]): Promise<number>;
  
  // Session operations
  getChatSession(sessionId: string): Promise<ChatSession>;
  updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void>;
}

export class ChatService implements ChatServiceInterface {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async createChatSession(assistantId: number, name?: string): Promise<string> {
    try {
      const response = await createChatSession(assistantId, name || null);
      return response;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  async nameChatSession(sessionId: string): Promise<void> {
    try {
      await nameChatSession(sessionId);
    } catch (error) {
      console.error('Error naming chat session:', error);
      throw error;
    }
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    // This would be implemented based on the existing sendMessage function
    // For now, we'll just throw an error to indicate it needs implementation
    throw new Error('sendMessage not implemented in ChatService');
  }

  async onSubmit(params: {
    messageIdToResend?: number;
    messageOverride?: string;
    queryOverride?: string;
    forceSearch?: boolean;
    isSeededChat?: boolean;
    alternativeAssistantOverride?: any;
    modelOverride?: any;
    regenerationRequest?: any;
    overrideFileDescriptors?: any[];
  }): Promise<void> {
    // This would be implemented based on the existing onSubmit function
    // For now, we'll just throw an error to indicate it needs implementation
    throw new Error('onSubmit not implemented in ChatService');
  }

  async handleResubmitLastMessage(messageHistory: any[]): Promise<void> {
    // Grab the last user-type message
    const lastUserMsg = messageHistory
      .slice()
      .reverse()
      .find((m) => m.type === "user");
    if (!lastUserMsg) {
      setPopup({
        message: "No previously-submitted user message found.",
        type: "error",
      });
      return;
    }

    // We call onSubmit, passing a `messageOverride`
    this.onSubmit({
      messageIdToResend: lastUserMsg.messageId,
      messageOverride: lastUserMsg.message,
    });
  }

  async handleFeedback(
    messageId: number,
    feedbackType: FeedbackType,
    feedbackDetails: string,
    predefinedFeedback?: string
  ): Promise<void> {
    try {
      const response = await handleChatFeedback(
        messageId,
        feedbackType,
        feedbackDetails,
        predefinedFeedback
      );

      if (!response.ok) {
        const responseJson = await response.json();
        const errorMsg = responseJson.detail || responseJson.message;
        throw new Error(`Failed to submit feedback - ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error handling feedback:', error);
      throw error;
    }
  }

  async uploadFiles(files: File[]): Promise<any[]> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${this.baseUrl}/api/user/file/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  async getTokenEstimate(fileIds: number[], folderIds: number[]): Promise<number> {
    try {
      const queryParams = new URLSearchParams();
      fileIds.forEach(id => queryParams.append('file_ids', id.toString()));
      folderIds.forEach(id => queryParams.append('folder_ids', id.toString()));

      const response = await fetch(
        `${this.baseUrl}/api/user/file/token-estimate?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch token estimate');
      }

      const data = await response.json();
      return data.token_count || 0;
    } catch (error) {
      console.error('Error getting token estimate:', error);
      return 0;
    }
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/get-chat-session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw error;
    }
  }

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/update-chat-session/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update chat session');
      }
    } catch (error) {
      console.error('Error updating chat session:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const chatService = new ChatService(); 