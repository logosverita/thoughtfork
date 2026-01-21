import { useCallback } from 'react';
import { Message } from '../../shared/types';
import { StorageManager } from '../../shared/storage';

const storage = new StorageManager();

export function useStorage() {
  const updateMessage = useCallback(
    async (messageId: string, updates: Partial<Message>): Promise<void> => {
      await storage.updateMessage(messageId, updates);
    },
    []
  );

  const addMessage = useCallback(async (message: Message): Promise<void> => {
    await storage.addMessage(message);
  }, []);

  return { updateMessage, addMessage };
}
