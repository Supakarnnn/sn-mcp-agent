import React from 'react';
import ChatBox from './components/ChatBox';
import { useChat } from './hooks/useChat';
import styles from './page.module.css';

export default function ChatPage() {
  const {
    messages,
    input,
    setInput,
    loading,
    apiMode,
    setApiMode,
    selectedMessageIndex,
    setSelectedMessageIndex,
    markdownRef,
    messagesEndRef,
    handleSend,
    handleMarkdownToPDF,
    getSelectedMarkdownContent,
    getSelectedMessageSource,
  } = useChat();

  return (
    <div className={styles.container}>
      <ChatBox
        messages={messages}
        loading={loading}
        apiMode={apiMode}
        setApiMode={setApiMode}
        selectedMessageIndex={selectedMessageIndex}
        setSelectedMessageIndex={setSelectedMessageIndex}
        messagesEndRef={messagesEndRef}
        handleMarkdownToPDF={handleMarkdownToPDF}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        markdownRef={markdownRef}
        getSelectedMarkdownContent={getSelectedMarkdownContent}
        getSelectedMessageSource={getSelectedMessageSource}
      />
    </div>
  );
}