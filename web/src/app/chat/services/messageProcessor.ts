import {
  Message,
  RetrievalType,
  ToolCallMetadata,
  FileDescriptor,
  ChatFileType,
  SubQuestionDetail,
} from "../interfaces";
import { PacketType, buildLatestMessageChain } from "../lib";
import {
  AnswerPiecePacket,
  OnyxDocument,
  DocumentInfoPacket,
  StreamStopInfo,
  SubQueryPiece,
  SubQuestionPiece,
  AgentAnswerPiece,
  RefinedAnswerImprovement,
  MinimalOnyxDocument,
} from "@/lib/search/interfaces";
import { constructSubQuestions } from "../interfaces";
import { RegenerationState } from "../types";

export class MessageProcessor {
  /**
   * Processes streaming message packets and returns updated message or null
   * This method handles the complex packet processing logic from the original ChatPage
   */
  processStreamingMessage(packet: PacketType): Message | null {
    // Handle different packet types based on the original logic
    if (Object.hasOwn(packet, "answer_piece")) {
      const answerPiece = packet as AnswerPiecePacket;
      return {
        messageId: -1, // Temporary ID for streaming
        message: answerPiece.answer_piece,
        type: "assistant",
        files: [],
        toolCall: null,
        parentMessageId: null,
        is_generating: true,
      };
    }

    if (Object.hasOwn(packet, "top_documents")) {
      const docPacket = packet as DocumentInfoPacket;
      return {
        messageId: -1,
        message: "",
        type: "assistant",
        files: [],
        toolCall: null,
        parentMessageId: null,
        documents: docPacket.top_documents,
        retrievalType: RetrievalType.Search,
        is_generating: true,
      };
    }

    if (Object.hasOwn(packet, "tool_name")) {
      const toolPacket = packet as ToolCallMetadata;
      return {
        messageId: -1,
        message: "",
        type: "assistant",
        files: [],
        toolCall: toolPacket,
        parentMessageId: null,
        is_generating: true,
      };
    }

    if (Object.hasOwn(packet, "file_ids")) {
      const filePacket = packet as { file_ids: string[] };
      const files: FileDescriptor[] = filePacket.file_ids.map((fileId) => ({
        id: fileId,
        type: ChatFileType.IMAGE,
      }));
      
      return {
        messageId: -1,
        message: "",
        type: "assistant",
        files,
        toolCall: null,
        parentMessageId: null,
        is_generating: true,
      };
    }

    if (Object.hasOwn(packet, "error")) {
      const errorPacket = packet as { error: string; stack_trace?: string };
      return {
        messageId: -1,
        message: errorPacket.error,
        type: "error",
        files: [],
        toolCall: null,
        parentMessageId: null,
        stackTrace: errorPacket.stack_trace || null,
      };
    }

    // Handle sub-question packets
    if (Object.hasOwn(packet, "sub_question")) {
      const subQuestionPacket = packet as SubQuestionPiece;
      return {
        messageId: -1,
        message: "",
        type: "assistant",
        files: [],
        toolCall: null,
        parentMessageId: null,
        is_agentic: true,
        is_generating: true,
        isStreamingQuestions: true,
      };
    }

    // Handle refined answer improvement
    if (Object.hasOwn(packet, "refined_answer_improvement")) {
      const improvementPacket = packet as RefinedAnswerImprovement;
      return {
        messageId: -1,
        message: "",
        type: "assistant",
        files: [],
        toolCall: null,
        parentMessageId: null,
        isImprovement: improvementPacket.refined_answer_improvement,
        is_generating: true,
      };
    }

    return null;
  }

  /**
   * Builds the latest message chain from a message map
   * Delegates to the existing buildLatestMessageChain function from lib.tsx
   */
  buildMessageChain(
    messages: Message[] | Map<number, Message>,
    additionalMessagesOnMainline: Message[] = []
  ): Message[] {
    // Convert array to map if needed
    const messageMap = messages instanceof Map ? messages : new Map(
      messages.map(msg => [msg.messageId, msg])
    );

    // Use the existing function from lib.tsx
    return buildLatestMessageChain(messageMap, additionalMessagesOnMainline);
  }

  /**
   * Handles message regeneration by creating a regeneration request
   * This method encapsulates the regeneration logic from the original ChatPage
   */
  handleMessageRegeneration(
    messageId: number,
    parentMessage: Message,
    forceSearch?: boolean
  ): RegenerationRequest {
    return {
      messageId,
      parentMessage,
      forceSearch: forceSearch || false,
    };
  }

  /**
   * Creates a replacements map for message regeneration
   * This handles the complex ID mapping logic during regeneration
   */
  createRegenerationReplacementsMap(
    regenerationRequest: RegenerationRequest,
    assistantMessageId: number
  ): Map<number, number> | null {
    if (!regenerationRequest) return null;

    return new Map([
      [
        regenerationRequest.parentMessage.messageId,
        regenerationRequest.parentMessage.messageId,
      ],
      [
        regenerationRequest.messageId,
        assistantMessageId,
      ],
    ] as [number, number][]);
  }

  /**
   * Determines if a message should be included in regeneration
   * Filters out messages that come after the regeneration point
   */
  shouldIncludeMessageInRegeneration(
    message: Message,
    regenerationRequest: RegenerationRequest | null
  ): boolean {
    if (!regenerationRequest) return true;
    
    // Include messages up to and including the parent message
    return message.messageId <= regenerationRequest.parentMessage.messageId;
  }

  /**
   * Gets the correct parent message ID for regeneration
   * Handles the complex parent-child relationship logic during regeneration
   */
  getRegenerationParentMessageId(
    regenerationRequest: RegenerationRequest | null,
    userMessageId: number,
    lastSuccessfulMessageId: number | null,
    systemMessageId: number
  ): number {
    if (regenerationRequest) {
      return regenerationRequest.parentMessage.messageId;
    }
    return lastSuccessfulMessageId ?? systemMessageId;
  }

  /**
   * Gets the correct children message IDs for regeneration
   * Preserves existing children and adds the new assistant message
   */
  getRegenerationChildrenMessageIds(
    regenerationRequest: RegenerationRequest | null,
    assistantMessageId: number
  ): number[] {
    const existingChildren = regenerationRequest?.parentMessage?.childrenMessageIds || [];
    return [...existingChildren, assistantMessageId];
  }

  /**
   * Creates a regeneration state for tracking regeneration progress
   * This encapsulates the regeneration state management logic
   */
  createRegenerationState(messageId: number): RegenerationState {
    return {
      regenerating: true,
      finalMessageIndex: messageId,
    };
  }

  /**
   * Determines if a message should be hidden during regeneration
   * Hides messages that come after the regeneration point
   */
  shouldHideMessageDuringRegeneration(
    message: Message,
    regenerationState: RegenerationState | null
  ): boolean {
    if (!regenerationState) return false;
    
    return (
      regenerationState.regenerating &&
      message.messageId > regenerationState.finalMessageIndex
    );
  }

  /**
   * Creates a regenerator function for UI components
   * Returns a function that only needs modelOverride to be specified when called
   */
  createRegenerator(
    regenerationRequest: RegenerationRequest,
    onSubmit: (params: {
      modelOverride: any;
      messageIdToResend?: number;
      regenerationRequest?: RegenerationRequest;
      forceSearch?: boolean;
    }) => Promise<void>
  ) {
    // Returns new function that only needs `modelOverride` to be specified when called
    return async function (modelOverride: any) {
      return await onSubmit({
        modelOverride,
        messageIdToResend: regenerationRequest.parentMessage.messageId,
        regenerationRequest,
        forceSearch: regenerationRequest.forceSearch,
      });
    };
  }
}

/**
 * Interface for regeneration requests
 * This matches the RegenerationRequest interface from the original ChatPage
 */
export interface RegenerationRequest {
  messageId: number;
  parentMessage: Message;
  forceSearch?: boolean;
} 