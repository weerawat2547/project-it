import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

const API_URL = 'http://localhost/it_repair_api/chat_ai.php';

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

      setMessages((prev) => [...prev, prev.length ? botMessage : botMessage]);
    } catch (error) {
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
    <Card className="w-full h-[calc(100vh-80px)] min-h-[600px] flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-blue-800/40 text-slate-100 shadow-2xl relative overflow-hidden rounded-2xl">
      {/* Background Light Glow Animation - ปรับวงแสงเรืองสว่างขึ้น */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Header - พื้นหลังหัวการ์ดสว่างนวลตา */}
      <CardHeader className="p-6 border-b border-blue-700/30 bg-slate-900/80 backdrop-blur-md z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-3.5 rounded-2xl shadow-md shadow-blue-500/30">
              <MessageSquare className="size-8 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 size-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
            <span className="absolute bottom-0 right-0 size-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-300 via-cyan-200 to-white bg-clip-text text-transparent flex items-center gap-2">
              AI IT Support Assistant
              <Sparkles className="size-5 text-cyan-300 animate-bounce" />
            </CardTitle>
            <CardDescription className="text-blue-200/80 text-sm mt-1 font-normal">
              สอบถามปัญหา IT แจ้งซ่อม และเช็กสถานะได้ตลอด 24 ชั่วโมง
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col overflow-hidden p-6 z-10">
        <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-3 scrollbar-thin scrollbar-thumb-blue-900">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 size-12 rounded-2xl flex items-center justify-center shadow-md transition-transform hover:scale-105 ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="size-6" /> : <Bot className="size-6" />}
              </div>

              {/* Message Bubble - ฝั่งบอทเปลี่ยนเป็นสว่างสบายตาขึ้น */}
              <div className={`max-w-[80%] ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block px-5 py-4 rounded-2xl text-base shadow-md transition-all ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-none shadow-blue-900/40'
                      : 'bg-slate-800/90 border border-blue-500/20 text-slate-100 rounded-tl-none shadow-slate-950/50 backdrop-blur-md'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>
                </div>
                <p className="text-xs text-blue-200/60 mt-1.5 px-1">
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
              <div className="flex-shrink-0 size-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
                <Bot className="size-6" />
              </div>
              <div className="bg-slate-800/90 border border-blue-500/20 px-6 py-4 rounded-2xl rounded-tl-none flex items-center gap-2 backdrop-blur-md">
                <span className="size-2.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="size-2.5 bg-blue-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="size-2.5 bg-indigo-300 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies - ปุ่มคำถามสว่าง คมชัด */}
        <div className="mb-4 pt-3 border-t border-blue-800/40">
          <p className="text-xs text-blue-200/80 mb-2.5 font-medium flex items-center gap-1.5">
            <Sparkles className="size-4 text-cyan-300" /> คำถามที่ถามบ่อย:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {quickReplies.map((reply) => (
              <Button
                key={reply}
                variant="outline"
                size="default"
                disabled={isLoading}
                onClick={() => sendMessageToAI(reply)}
                className="text-sm bg-slate-800/80 border-blue-700/40 text-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-400 transition-all rounded-xl active:scale-95 px-4 py-2 shadow-sm"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Form - ช่องพิมพ์เปลี่ยนเป็นสีสว่าง คมชัดขึ้น */}
        <form onSubmit={handleSendMessage} className="flex gap-3 relative">
          <Input
            placeholder="พิมพ์คำถามเกี่ยวกับปัญหา IT..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-14 bg-slate-800/90 border-blue-700/50 text-slate-100 text-base placeholder:text-blue-300/50 focus-visible:ring-cyan-400/50 focus-visible:border-cyan-400 rounded-xl transition-all shadow-inner px-5"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputMessage.trim()}
            className="size-14 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white rounded-xl shadow-md shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="size-6" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}