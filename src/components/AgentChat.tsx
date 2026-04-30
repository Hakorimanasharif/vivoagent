import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Users, Shield, Search, Loader2, Paperclip, Image as ImageIcon, Mic } from "lucide-react";

interface User {
  _id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  online: boolean;
}

interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

interface Message {
  _id: string;
  text: string;
  senderId?: string;
  sender?: string;
  isRead: boolean;
  createdAt: string;
}

const AgentChat: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'clients' | 'admins' | 'agents'>('all');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminId, setAdminId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const agentToken = localStorage.getItem('agentToken') || '';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = 'https://globalbackend-oqoz.onrender.com';

  useEffect(() => {
    try {
       const tokenParts = agentToken.split('.');
       if(tokenParts.length > 1) {
          const payload = JSON.parse(atob(tokenParts[1]));
          setAdminId(payload.userId || payload.id || payload._id || 'agent123');
       }
    } catch(e) {}
  }, [agentToken]);

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ['admin-chat', activeTab],
    queryFn: async () => {
      const roleParam = activeTab === 'all' ? '' : `role=${activeTab}`;
      const response = await fetch(`${API_BASE}/api/admin/chat/conversations?${roleParam}`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to load conversations');
      return response.json();
    },
    enabled: !!agentToken,
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['chat-messages', activeUserId],
    queryFn: async () => {
      if (!activeUserId) return [];
      const response = await fetch(`${API_BASE}/api/admin/chat/${activeUserId}/messages`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to load messages');
      return response.json();
    },
    enabled: !!activeUserId && !!agentToken,
    refetchInterval: 2500,
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeUserId]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!activeUserId || !text.trim()) return;
      const response = await fetch(`${API_BASE}/api/admin/chat/${activeUserId}/message`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${agentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error('Failed to send');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeUserId] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat', activeTab] });
      setNewMsg('');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${agentToken}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        const isAudio = file.type.startsWith('audio/');
        const msgText = isAudio ? `[AUDIO](${data.imageUrl})` : `![Image](${data.imageUrl})`;
        await sendMutation.mutateAsync(msgText);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openChat = (userId: string) => {
    setActiveUserId(userId);
    queryClient.invalidateQueries({ queryKey: ['chat-messages', userId] });
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['admin-chat'] }), 500);
  };
  
  const closeChat = () => setActiveUserId(null);

  const filteredConvos = conversations.filter(c => 
    (c.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.user?.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  let adminCounter = 1;
  const adminMap = new Map<string, string>();
  
  const getAdminAlias = (user?: User) => {
    if (!user) return 'Unknown User';
    if (user.role === 'admin') {
      if (!adminMap.has(user._id)) {
        adminMap.set(user._id, `Admin ${adminCounter++}`);
      }
      return adminMap.get(user._id);
    }
    return user.name;
  };

  const activeUserData = conversations.find(c => c.user?._id === activeUserId)?.user;

  const renderConversationItem = (conversation: Conversation) => (
    <div 
      key={conversation.id} 
      onClick={() => conversation.user?._id && openChat(conversation.user._id)}
      className={`p-3 border-b cursor-pointer transition-colors flex items-center gap-3 hover:bg-muted/50 ${activeUserId === conversation.user?._id ? 'bg-muted/60 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
    >
      <div className="relative">
        <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm
          ${activeUserId === conversation.user?._id ? 'bg-primary' : 'bg-slate-500'}`}
        >
          {getAdminAlias(conversation.user)?.charAt(0).toUpperCase() || 'U'}
        </div>
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#ff3040] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-background">
            {conversation.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-sm truncate">
            {conversation.user?.role === 'admin' ? <strong>{getAdminAlias(conversation.user)}</strong> : getAdminAlias(conversation.user)}
          </h3>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
            {new Date(conversation.lastTime).getTime() > 10000 ? new Date(conversation.lastTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </span>
        </div>
        <p className={`text-xs truncate ${conversation.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
          {conversation.lastMessage}
        </p>
      </div>
    </div>
  );

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
        >
          <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-[#ff3040] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce border-2 border-background shadow-sm">
              {totalUnread}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[450px] max-w-full h-[85vh] sm:h-[600px] max-h-[100vh] sm:max-h-[calc(100vh-100px)] flex flex-col bg-background sm:border shadow-2xl sm:rounded-2xl rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="flex items-center justify-between p-3 sm:p-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold leading-tight">Agent Support Chat</h1>
              <p className="text-xs text-primary-foreground/80 font-medium">Real-time messaging</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex overflow-hidden bg-background">
          {!activeUserId ? (
            <div className="w-full flex flex-col h-full bg-muted/10">
              <div className="p-3 border-b bg-background">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    className="pl-9 h-9 bg-muted/50 border-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={(value: any) => { setActiveTab(value); closeChat(); }} className="flex flex-col flex-1 h-full min-h-0">
                <div className="px-3 pt-3 pb-2 border-b">
                  <TabsList className="grid w-full grid-cols-4 p-1 bg-muted/50 h-10">
                    <TabsTrigger value="all" className="text-xs font-semibold">All</TabsTrigger>
                    <TabsTrigger value="clients" className="text-xs font-semibold">Clients</TabsTrigger>
                    <TabsTrigger value="admins" className="text-xs font-semibold">Admins</TabsTrigger>
                    <TabsTrigger value="agents" className="text-xs font-semibold">Agents</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value={activeTab} className="flex-1 overflow-y-auto m-0 outline-none">
                  {convLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                      <span className="text-xs">Loading connections...</span>
                    </div>
                  ) : filteredConvos.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                      <Users className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-sm">No conversations found.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {filteredConvos.map(renderConversationItem)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="w-full flex flex-col bg-background h-full relative">
                <div className="h-14 sm:h-16 border-b bg-background flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white uppercase shadow-sm">
                      {getAdminAlias(activeUserData)?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h2 className="font-bold text-sm leading-tight">
                        {activeUserData?.role === 'admin' ? <strong>{getAdminAlias(activeUserData)}</strong> : getAdminAlias(activeUserData)}
                      </h2>
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span> Secure Live Connection
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={closeChat}>
                      Back to List
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mb-3 text-primary" />
                      <p className="text-sm">Decrypting messages...</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((m, idx) => {
                        const sId = m.sender || m.senderId;
                        const isAdminMsg = sId === adminId;
                        return (
                          <div key={m._id || idx} className={`flex ${isAdminMsg ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[75%] px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-sm ${
                              isAdminMsg ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-white dark:bg-zinc-800 border text-foreground rounded-tl-sm'
                            }`}>
                              {/!\[Image\]\((.*?)\)/.test(m.text) ? (
                                <img 
                                  src={m.text.match(/!\[Image\]\((.*?)\)/)?.[1]} 
                                  alt="Attachment" 
                                  className="max-w-full rounded-lg mb-1 max-h-[250px] object-contain cursor-pointer" 
                                  onClick={() => setSelectedImageUrl(m.text.match(/!\[Image\]\((.*?)\)/)?.[1] || null)} 
                                />
                              ) : /\[AUDIO\]\((.*?)\)/.test(m.text) ? (
                                <audio controls src={m.text.match(/\[AUDIO\]\((.*?)\)/)?.[1]} className="max-w-full h-10 mb-1" />
                              ) : (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                              )}
                              <div className={`flex items-center gap-1 mt-1 text-[10px] ${isAdminMsg ? 'justify-end text-primary-foreground/80' : 'justify-start text-muted-foreground'}`}>
                                <span>{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {isAdminMsg && <span className="ml-1">{m.isRead ? '✓✓' : '✓'}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="p-3 sm:p-4 bg-background border-t shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(newMsg); }} className="flex gap-2 items-center relative">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,audio/*" />
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                    </Button>
                    <Input
                      autoFocus
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 h-10 rounded-full px-4 bg-muted/40 border-none"
                      disabled={sendMutation.isPending || messagesLoading || isUploading}
                    />
                    <Button type="submit" size="icon" className="h-10 w-10 rounded-full" disabled={!newMsg.trim() || sendMutation.isPending || isUploading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
            </div>
          )}
        </div>
      </div>

      {selectedImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="absolute top-4 right-4 z-10">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={() => setSelectedImageUrl(null)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="relative max-w-full max-h-full flex flex-col items-center gap-4">
            <img 
              src={selectedImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <p className="text-white text-xs font-bold tracking-widest uppercase">Secure Preview</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentChat;
