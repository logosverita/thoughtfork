import { useCallback } from 'react';
import { Branch } from '../../shared/types';
import { StorageManager } from '../../shared/storage';
import { generateBranchColor } from '../../shared/utils';

const storage = new StorageManager();

export function useBranches() {
  const createBranch = useCallback(
    async (conversationId: string, forkMessageId: string, name?: string): Promise<Branch> => {
      const data = await storage.getData(conversationId);
      const branchCount = data.branches.length;

      return storage.createBranch(
        conversationId,
        forkMessageId,
        name || `Branch-${branchCount + 1}`,
        generateBranchColor(branchCount)
      );
    },
    []
  );

  return { createBranch };
}
