import { useState, useRef, useEffect } from 'react';
import { fetchAIResponse } from '../services/apiService';
import { generatePDF } from '../utils/pdfGenerator';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState('chat'); // chat | report | sickReport
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const markdownRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'human', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const apiURL = getApiUrl(apiMode);
      const response = await fetchAIResponse(apiURL, updatedMessages);
      const aiMessage = {
        role: 'ai',
        content: response,
        source: getSource(apiMode),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'ai',
        content: 'Sorry, I\'m having trouble connecting to the server. Please check your network connection or try again later.',
        source: 'System',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const getApiUrl = (mode) => {
    return mode === 'report'
      ? process.env.NEXT_PUBLIC_REPORT_API_URL || '/api/create-check-in-report'
      : mode === 'sickReport'
      ? process.env.NEXT_PUBLIC_SICK_REPORT_API_URL || '/api/create-take-leave-report'
      : process.env.NEXT_PUBLIC_CHAT_API_URL || '/api/chat';
  };

  const getSource = (mode) => {
    return mode === 'report' ? 'Tool - Report' : mode === 'sickReport' ? 'Tool - Sick Report' : 'AI 1';
  };

  const getSelectedMarkdownContent = () => {
    const aiMessages = messages.filter((msg) => msg.role === 'ai');
    if (aiMessages.length === 0) return null;
    if (selectedMessageIndex !== null && selectedMessageIndex >= 0 && selectedMessageIndex < aiMessages.length) {
      return aiMessages[selectedMessageIndex].content;
    }
    return aiMessages[aiMessages.length - 1].content;
  };

  const getSelectedMessageSource = () => {
    const aiMessages = messages.filter((msg) => msg.role === 'ai');
    if (aiMessages.length === 0) return 'AI';
    if (selectedMessageIndex !== null && selectedMessageIndex >= 0 && selectedMessageIndex < aiMessages.length) {
      return aiMessages[selectedMessageIndex].source || 'AI';
    }
    return aiMessages[aiMessages.length - 1].source || 'AI';
  };

  const handleMarkdownToPDF = async () => {
    const markdownContent = getSelectedMarkdownContent();
    if (!markdownContent) {
      alert('No AI response to convert to PDF!');
      return;
    }
    setLoading(true);
    try {
      const title = getSelectedMessageSource() === 'Tool - Report'
        ? 'Check-In Report'
        : getSelectedMessageSource() === 'Tool - Sick Report'
        ? 'Sick Leave Report'
        : 'Chat Response';
      await generatePDF(markdownRef, title);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
      setSelectedMessageIndex(null);
    }
  };

  return {
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
  };
};