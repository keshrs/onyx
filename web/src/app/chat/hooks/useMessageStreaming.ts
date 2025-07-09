import { useState, useRef, useCallback } from 'react';
import { PacketType, SendMessageParams, Message } from '../interfaces';
import { sendMessage } from '../lib';

export interface StreamingManager {
  // Streaming state
  isStreaming: boolean;
  uncaughtError: string | null;
  agenticGenerating: boolean;
  loadingError: string | null;
  
  // Streaming operations
  startStreaming: (params: SendMessageParams) => Promise<void>;
  stopStreaming: () => void;
  processPacket: (packet: PacketType) => Message | null;
  
  // Error handling
  setUncaughtError: (error: string | null) => void;
  setLoadingError: (error: string | null) => void;
  
  // Agentic state
  setAgenticGenerating: (generating: boolean) => void;
  
  // Abort controller
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  
  // FIFO queue for backward compatibility
  CurrentMessageFIFO: typeof CurrentMessageFIFO;
  updateCurrentMessageFIFO: typeof updateCurrentMessageFIFO;
}

// FIFO queue for message packets
class CurrentMessageFIFO {
  private stack: PacketType[] = [];
  isComplete: boolean = false;
  error: string | null = null;

  push(packetBunch: PacketType) {
    this.stack.push(packetBunch);
  }

  nextPacket(): PacketType | undefined {
    return this.stack.shift();
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }
}

export function useMessageStreaming(): StreamingManager {
  const [isStreaming, setIsStreaming] = useState(false);
  const [uncaughtError, setUncaughtError] = useState<string | null>(null);
  const [agenticGenerating, setAgenticGenerating] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const startStreaming = useCallback(async (params: SendMessageParams) => {
    setIsStreaming(true);
    setUncaughtError(null);
    setLoadingError(null);

    const controller = new AbortController();
    setAbortController(controller);

    const stack = new CurrentMessageFIFO();

    try {
      await updateCurrentMessageFIFO(stack, { ...params, signal: controller.signal });
    } catch (error) {
      console.error('Streaming error:', error);
      setUncaughtError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsStreaming(false);
  }, [abortController]);

  const processPacket = useCallback((packet: PacketType): Message | null => {
    // This is a simplified version - the actual implementation would need
    // to handle all the different packet types and convert them to messages
    if ('error' in packet && packet.error) {
      setLoadingError(packet.error);
      return null;
    }

    // Process different packet types and return appropriate message
    // This would need to be expanded based on the actual packet types
    return null;
  }, []);

  return {
    isStreaming,
    uncaughtError,
    agenticGenerating,
    loadingError,
    startStreaming,
    stopStreaming,
    processPacket,
    setUncaughtError,
    setLoadingError,
    setAgenticGenerating,
    abortController,
    setAbortController,
    CurrentMessageFIFO,
    updateCurrentMessageFIFO,
  };
}

// Helper function to update the FIFO queue
async function updateCurrentMessageFIFO(
  stack: CurrentMessageFIFO,
  params: SendMessageParams
) {
  try {
    for await (const packet of sendMessage(params)) {
      if (params.signal?.aborted) {
        throw new Error("AbortError");
      }
      stack.push(packet);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.debug("Stream aborted");
      } else {
        stack.error = error.message;
      }
    } else {
      stack.error = String(error);
    }
  } finally {
    stack.isComplete = true;
  }
} 