
import React, { useState } from 'react';
import { WhatsAppIcon, SendIcon, XIcon } from './icons';

const WhatsAppButton: React.FC = () => {
  const WHATSAPP_NUMBER = '919092908888';
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === '') return;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setMessage('');
    setIsChatOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
    }
  };

  return (
    <>
      {/* Chat Widget */}
      <div 
        className={`fixed bottom-24 right-4 sm:right-8 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out transform-gpu ${isChatOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-hidden={!isChatOpen}
      >
        {/* Header */}
        <div className="bg-[#075E54] text-white p-3 rounded-t-xl flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-3">
            <img src={`https://ui-avatars.com/api/?name=N&background=FFFFFF&color=075E54&bold=true`} alt="Nadanaloga Admin" className="w-10 h-10 rounded-full" />
            <div>
              <h3 className="font-bold">Nadanaloga Admin</h3>
              <p className="text-xs opacity-80">Online</p>
            </div>
          </div>
          <button
            onClick={() => setIsChatOpen(false)}
            className="text-white opacity-70 hover:opacity-100"
            aria-label="Close chat"
          >
            <XIcon />
          </button>
        </div>

        {/* Messages Area */}
        <div className="p-4 flex-grow h-64 bg-[#E5DDD5] bg-opacity-80 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center overflow-y-auto">
          <div className="bg-white p-3 rounded-lg shadow-sm self-start max-w-[85%] rounded-tl-none">
            <p className="text-sm text-gray-800">Hi there! 👋</p>
            <p className="text-sm text-gray-800 mt-1">How can we help you today? Type your message below to start a chat on WhatsApp.</p>
             <p className="text-right text-xs text-gray-400 mt-1">11:30 AM</p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-2 bg-gray-100 flex items-center space-x-2 rounded-b-xl border-t flex-shrink-0">
          <input
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-grow form-input text-sm py-2"
            aria-label="Your message"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="bg-[#128C7E] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-md hover:bg-[#075E54] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
            disabled={!message.trim()}
          >
            <SendIcon />
          </button>
        </form>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsChatOpen(prev => !prev)}
        aria-label={isChatOpen ? "Close chat" : "Open WhatsApp chat"}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-16 h-16 flex items-center justify-center rounded-full shadow-xl hover:bg-[#128C7E] transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-300"
        aria-expanded={isChatOpen}
      >
        <div className={`transition-all duration-300 ease-in-out absolute ${isChatOpen ? 'opacity-0 transform rotate-45 scale-0' : 'opacity-100 transform rotate-0 scale-100'}`}>
          <WhatsAppIcon className="h-8 w-8" />
        </div>
        <div className={`transition-all duration-300 ease-in-out absolute ${isChatOpen ? 'opacity-100 transform rotate-0 scale-100' : 'opacity-0 transform -rotate-45 scale-0'}`}>
          <XIcon className="h-8 w-8" />
        </div>
      </button>
    </>
  );
};

export default WhatsAppButton;
