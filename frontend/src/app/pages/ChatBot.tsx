import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

import { BASE_URL } from '../utils/api';

const API_URL = `${BASE_URL}/chat_ai.php`;

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      message:
        'สวัสดีครับ! ยินดีต้อนรับสู่ระบบแจ้งซ่อมอุปกรณ์ IT ผมคือ AI Assistant ที่พร้อมตอบคำถามเกี่ยวกับระบบและการแก้ปัญหา IT เบื้องต้น มีอะไรให้ผมช่วยไหมครับ?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessageToAI = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: data.reply || 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผลคำตอบ',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: 'ขออภัยครับ ไม่สามารถเชื่อมต่อกับระบบ AI ได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่อ',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageToAI(inputMessage);
  };

  const quickReplies = ['วิธีแจ้งซ่อม', 'ตรวจสอบสถานะ', 'ช่องทางติดต่อ', 'ระยะเวลาการซ่อม'];

  return (
    <Card className="w-full h-[calc(100vh-80px)] min-h-[650px] flex flex-col bg-slate-950 border-2 border-slate-800 text-slate-100 shadow-2xl relative overflow-hidden rounded-3xl">
      {/* Background Light Glow Effects */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-blue-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Header */}
      <CardHeader className="p-6 border-b-2 border-slate-800/80 bg-slate-900/90 backdrop-blur-xl z-10 shadow-md">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
              <MessageSquare className="size-8 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 size-4 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
            <span className="absolute bottom-0 right-0 size-4 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black bg-gradient-to-r from-blue-200 via-cyan-200 to-white bg-clip-text text-transparent flex items-center gap-2.5 tracking-tight">
              AI IT Support Assistant
              <Sparkles className="size-6 text-cyan-300 animate-bounce" />
            </CardTitle>
            <CardDescription className="text-slate-300 font-medium text-base mt-1">
              สอบถามปัญหา IT แจ้งซ่อม และเช็กสถานะได้ตลอด 24 ชั่วโมง
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col overflow-hidden p-6 z-10">
        <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-3 scrollbar-thin scrollbar-thumb-slate-700">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 size-13 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-600/30'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="size-7" /> : <Bot className="size-7" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[80%] ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block px-6 py-4 rounded-3xl text-lg font-medium shadow-lg transition-all leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-semibold rounded-tr-none shadow-blue-900/50'
                      : 'bg-slate-800/95 border-2 border-slate-700/80 text-slate-100 rounded-tl-none shadow-black/40 backdrop-blur-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.message}</p>
                </div>
                <p className="text-sm font-semibold text-slate-400 mt-2 px-2">
                  {new Date(msg.timestamp).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Loader */}
          {isLoading && (
            <div className="flex gap-4 flex-row animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-shrink-0 size-13 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                <Bot className="size-7" />
              </div>
              <div className="bg-slate-800/95 border-2 border-slate-700/80 px-6 py-5 rounded-3xl rounded-tl-none flex items-center gap-2.5 shadow-lg backdrop-blur-md">
                <span className="size-3 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="size-3 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="size-3 bg-indigo-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        <div className="mb-4 pt-4 border-t-2 border-slate-800/80">
          <p className="text-sm text-slate-300 font-bold mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-cyan-300" /> คำถามที่ถามบ่อย:
          </p>
          <div className="flex flex-wrap gap-3">
            {quickReplies.map((reply) => (
              <Button
                key={reply}
                variant="outline"
                size="default"
                disabled={isLoading}
                onClick={() => sendMessageToAI(reply)}
                className="text-base font-bold bg-slate-800/90 border-2 border-slate-700 text-slate-100 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all rounded-2xl active:scale-95 px-5 py-2.5 shadow-md"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-3 relative">
          <Input
            placeholder="พิมพ์คำถามเกี่ยวกับปัญหา IT..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-14 bg-slate-900/90 border-2 border-slate-700/90 text-slate-100 text-lg font-medium placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-cyan-400 rounded-2xl transition-all shadow-inner px-6"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputMessage.trim()}
            className="size-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="size-6" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}