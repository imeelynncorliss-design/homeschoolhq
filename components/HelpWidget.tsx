import { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Position {
  x: number;
  y: number;
}

// Cardinal SVG mascot — inline so no image dependency
const CardinalIcon = ({ size = 48 }: { size?: number }) => {
  return (
    <div
      className="relative inline-block animate-bounce"
      style={{ animationDuration: '3s', width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Cardinal mascot"
      >
        {/* Body */}
        <ellipse cx="50" cy="62" rx="22" ry="20" fill="#D92B2B" />
        {/* Head */}
        <circle cx="50" cy="38" r="16" fill="#D92B2B" />
        {/* Crest (3 feather spikes) */}
        <polygon points="50,14 46,26 50,22 54,26" fill="#B01C1C" />
        <polygon points="50,10 47,22 50,18 53,22" fill="#C62020" />
        <polygon points="50,7  48,20 50,16 52,20" fill="#D92B2B" />
        {/* Wing */}
        <ellipse cx="38" cy="65" rx="10" ry="14" fill="#B01C1C" transform="rotate(-10 38 65)" />
        {/* Black face mask */}
        <ellipse cx="50" cy="44" rx="11" ry="7" fill="#1a1a1a" />
        {/* Eye */}
        <circle cx="54" cy="41" r="3" fill="#1a1a1a" />
        <circle cx="55" cy="40" r="1" fill="white" />
        {/* Beak */}
        <polygon points="60,45 72,43 60,50" fill="#F4A020" />
        {/* Feet */}
        <line x1="44" y1="80" x2="40" y2="90" stroke="#F4A020" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="90" x2="36" y2="93" stroke="#F4A020" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="90" x2="40" y2="95" stroke="#F4A020" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="90" x2="44" y2="93" stroke="#F4A020" strokeWidth="2" strokeLinecap="round" />
        <line x1="56" y1="80" x2="60" y2="90" stroke="#F4A020" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="90" x2="56" y2="93" stroke="#F4A020" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="90" x2="60" y2="95" stroke="#F4A020" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="90" x2="64" y2="93" stroke="#F4A020" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        "Hi! I'm Scout, your HomeschoolReady co-pilot. I'm here to keep you on course no matter what the day brings. What can I help you with?",
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 100, y: window.innerHeight - 100 };
    }
    return { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      const chatWidth = 384;
      const chatHeight = isMinimized ? 56 : 600;
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - chatWidth),
        y: Math.min(prev.y, window.innerHeight - chatHeight),
      }));
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const handleResize = () => {
      const buttonSize = isOpen ? 384 : 70;
      const height = isOpen ? 600 : 70;
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - buttonSize),
        y: Math.min(prev.y, window.innerHeight - height),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setHasDragged(true);
        const widgetWidth = isOpen ? 384 : 70;
        const widgetHeight = isOpen ? (isMinimized ? 56 : 600) : 70;
        setPosition({
          x: Math.max(0, Math.min(e.clientX - dragStart.x, window.innerWidth - widgetWidth)),
          y: Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - widgetHeight)),
        });
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setTimeout(() => setHasDragged(false), 100);
      }
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onMouseDown={handleMouseDown}
        onClick={() => { if (!hasDragged) setIsOpen(true); }}
        className="fixed bg-white/90 hover:bg-white rounded-2xl p-2 shadow-lg hover:shadow-xl transition-all duration-200 z-50 cursor-move border border-red-100"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        aria-label="Open Scout co-pilot"
        title="Scout — HomeschoolReady Co-pilot"
      >
        <CardinalIcon size={56} />
      </button>
    );
  }

  return (
    <div
      className={`fixed bg-white rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-200 ${
        isMinimized ? 'h-14' : 'h-[600px]'
      } w-96`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Header */}
      <div
        className="text-white px-4 py-3 rounded-t-xl flex items-center justify-between cursor-move select-none"
        style={{ background: 'linear-gradient(135deg, #C62020 0%, #D92B2B 100%)' }}
        onMouseDown={handleMouseDown}
        title="Drag to move"
      >
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-lg p-1">
            <CardinalIcon size={22} />
          </div>
          <div>
            <span className="font-semibold text-sm leading-none block">Cardinal</span>
            <span className="text-red-200 text-xs">HomeschoolReady Co-pilot</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            onMouseDown={e => e.stopPropagation()}
            className="hover:bg-white/20 rounded p-1 transition-colors"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIsOpen(false); }}
            onMouseDown={e => e.stopPropagation()}
            className="hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex-shrink-0">
                    <CardinalIcon size={24} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-50 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center gap-2">
                <CardinalIcon size={24} />
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white p-4 rounded-b-xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Scout anything..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm text-gray-900 bg-gray-50"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="text-white rounded-xl px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #C62020 0%, #D92B2B 100%)' }}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2"> · Your school, your pace.</p>
          </div>
        </>
      )}
    </div>
  );
}