import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../page.module.css';

const Message = ({ message, index, messages, selectedMessageIndex, setSelectedMessageIndex, handleMarkdownToPDF }) => {
  const aiMessages = messages.filter((m) => m.role === 'ai');
  const aiIndex = message.role === 'ai' ? aiMessages.indexOf(message) : -1;

  return (
    <div className={`${styles.message} ${message.role === 'human' ? styles.user : styles.ai}`}>
      <div>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
      {message.role === 'ai' && message.source && (
        <span className={styles.sourceTag}>{message.source}</span>
      )}
      {message.role === 'ai' && (
        <button
          className={styles.messagePdfButton}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMessageIndex(aiIndex);
            setTimeout(() => handleMarkdownToPDF(), 0);
          }}
          title="Convert this message to PDF"
        >
          📄 PDF
        </button>
      )}
    </div>
  );
};

export default Message;