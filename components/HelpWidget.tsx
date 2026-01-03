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

// Custom animated schoolhouse component using your image
const AnimatedSchoolhouse = ({ size = 48 }: { size?: number }) => {
  return (
    <div className="relative inline-block animate-bounce" style={{ animationDuration: '3s' }}>
      <img 
        src="/schoolhouse-helper.png" 
        alt="HomeschoolHQ Helper"
        width={size}
        height={size}
        className="drop-shadow-md rounded-full"
        onError={(e) => {
          console.log('Image failed to load from /schoolhouse-helper.png');
          // Fallback: try without leading slash
          e.currentTarget.src = 'schoolhouse-helper.png';
        }}
      />
    </div>
  );
};

export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm here to help you get the most out of HomeschoolHQ. What can I help you with today?",
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Start in bottom-right: window width - 100px, window height - 100px
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

  // Reposition widget when opening if it would go off-screen
  useEffect(() => {
    if (isOpen) {
      const chatWidth = 384; // w-96
      const chatHeight = isMinimized ? 56 : 600;
      
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - chatWidth),
        y: Math.min(prev.y, window.innerHeight - chatHeight),
      }));
    }
  }, [isOpen, isMinimized]);

  // Keep widget on screen when window resizes
  useEffect(() => {
    const handleResize = () => {
      const buttonSize = isOpen ? 384 : 70; // 70px for larger schoolhouse button
      const height = isOpen ? 600 : 70;
      
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - buttonSize),
        y: Math.min(prev.y, window.innerHeight - height),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setHasDragged(true);
        const widgetWidth = isOpen ? 384 : 70;
        const widgetHeight = isOpen ? (isMinimized ? 56 : 600) : 70;
        const newX = Math.max(0, Math.min(e.clientX - dragStart.x, window.innerWidth - widgetWidth));
        const newY = Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - widgetHeight));
        
        setPosition({
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Small delay to prevent click from firing immediately after drag
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

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call your API endpoint that uses Anthropic
      const response = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
        onClick={(e) => {
          if (!hasDragged) {
            setIsOpen(true);
          }
        }}
        className="fixed bg-transparent hover:bg-white/10 rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-200 z-50 cursor-move"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        aria-label="Open help chat"
        title="HomeschoolHQ Help - Drag to move"
      >
        <AnimatedSchoolhouse size={56} />
      </button>
    );
  }

  return (
    <div
      className={`fixed bg-white rounded-lg shadow-2xl z-50 flex flex-col transition-all duration-200 ${
        isMinimized ? 'h-14' : 'h-[600px]'
      } w-96`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header */}
      <div 
        className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
        title="Drag to move"
      >
        <div className="flex items-center gap-2">
          <div className="bg-white rounded p-1">
            <AnimatedSchoolhouse size={20} />
          </div>
          <span className="font-semibold">HomeschoolHQ Help</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="hover:bg-blue-700 rounded p-1 transition-colors"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="hover:bg-blue-700 rounded p-1 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}