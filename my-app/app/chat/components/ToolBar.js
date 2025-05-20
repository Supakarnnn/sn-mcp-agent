import React from 'react';
import styles from '../page.module.css';

const ToolBar = ({ apiMode, setApiMode, setMessages }) => {
  return (
    <div className={styles.toolBar}>
      <button
        className={`${styles.pillButton} ${apiMode === 'chat' ? styles.activePill : ''}`}
        onClick={() => setApiMode('chat')}
      >
        CHAT
      </button>
      <button
        className={`${styles.pillButton} ${apiMode === 'report' ? styles.activePill : ''}`}
        onClick={() => setApiMode('report')}
      >
        CREATE REPORT
      </button>
      <button
        className={`${styles.pillButton} ${apiMode === 'sickReport' ? styles.activePill : ''}`}
        onClick={() => setApiMode('sickReport')}
      >
        CREATE SICK REPORT
      </button>
      <button className={styles.resetButton} onClick={setMessages}>
        🗑️ Reset Chat
      </button>
    </div>
  );
};

export default ToolBar;