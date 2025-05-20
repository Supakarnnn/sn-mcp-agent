import React from 'react';
import styles from '../page.module.css';

const InputContainer = ({ input, setInput, handleSend, loading }) => {
  return (
    <div className={styles.inputContainer}>
      <input
        type="text"
        className={styles.inputField}
        placeholder="Type your message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <button className={styles.sendButton} onClick={handleSend} disabled={loading}>
        Send
      </button>
    </div>
  );
};

export default InputContainer;