import { ThoughtForkData, Message, MessageType } from '../shared/types';
import { StorageManager } from '../shared/storage';

const storage = new StorageManager();

/**
 * メッセージリスナー
 */
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // 非同期レスポンス
});

/**
 * メッセージハンドラー
 */
async function handleMessage(message: MessageType, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case 'NEW_MESSAGE':
      return await handleNewMessage(message.payload);

    case 'REQUEST_DATA':
      return await handleDataRequest(message.payload.conversationId);

    default:
      console.warn('[ThoughtFork] Unknown message type:', message);
  }
}

/**
 * 新しいメッセージを保存
 */
async function handleNewMessage(message: Message): Promise<void> {
  await storage.addMessage(message);

  // Side Panelに通知
  chrome.runtime.sendMessage({
    type: 'MESSAGE_ADDED',
    payload: message
  }).catch(() => {
    // Side Panelが開いていない場合は無視
  });
}

/**
 * データリクエストに応答
 */
async function handleDataRequest(conversationId: string): Promise<ThoughtForkData> {
  return await storage.getData(conversationId);
}

/**
 * 拡張機能アイコンクリックでSide Panelを開く
 */
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

/**
 * Side Panelを有効化
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
