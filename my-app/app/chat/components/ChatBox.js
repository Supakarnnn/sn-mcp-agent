import React from 'react';
import Message from './Message';
import ToolBar from './ToolBar';
import InputContainer from './InputContainer';
import MarkdownPreview from './MarkdownPreview';
import styles from '../page.module.css';

const ChatBox = ({
  messages,
  loading,
  apiMode,
  setApiMode,
  selectedMessageIndex,
  setSelectedMessageIndex,
  messagesEndRef,
  handleMarkdownToPDF,
  input,
  setInput,
  handleSend,
  markdownRef,
  getSelectedMarkdownContent,
  getSelectedMessageSource,
}) => {
  return (
    <div className={styles.chatbox}>
      <div className={styles.messages}>
        {messages.map((msg, idx) => (
          <Message
            key={idx}
            message={msg}
            index={idx}
            messages={messages}
            selectedMessageIndex={selectedMessageIndex}
            setSelectedMessageIndex={setSelectedMessageIndex}
            handleMarkdownToPDF={handleMarkdownToPDF}
          />
        ))}
        {loading && <div className={styles.typing}>AI is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      <ToolBar apiMode={apiMode} setApiMode={setApiMode} setMessages={() => messages.length = 0} />
      <InputContainer input={input} setInput={setInput} handleSend={handleSend} loading={loading} />
      <MarkdownPreview
        markdownRef={markdownRef}
        getSelectedMarkdownContent={getSelectedMarkdownContent}
        getSelectedMessageSource={getSelectedMessageSource}
      />
    </div>
  );
};

export default ChatBox;