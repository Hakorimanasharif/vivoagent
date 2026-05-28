import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, X, Send, Users, Search, Loader2, Paperclip, Mic, MoreVertical, Copy, Reply, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { messagePlainText, presenceSubtitle, extractImageUrlFromMessage, extractAudioUrlFromMessage } from "@/lib/chatHelpers";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";

interface User {
  _id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  online?: boolean;
  lastLogin?: string | null;
  recentlyActive?: boolean;
  lastMessageFromUserAt?: string | null;
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
  const [agentId, setAgentId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [replySnippet, setReplySnippet] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const queryClient = useQueryClient();
  const agentToken = localStorage.getItem('agentToken') || '';
  const API_BASE = 'https://globalbackend-oqoz.onrender.com';

  useEffect(() => {
    try {
      const tokenParts = agentToken.split('.');
      if (tokenParts.length > 1) {
        const payload = JSON.parse(atob(tokenParts[1]));
        setAgentId(String(payload.userId || payload.id || payload._id || 'agent123'));
      }
    } catch { /* ignore */ }
  }, [agentToken]);

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ['admin-chat', activeTab],
    queryFn: async () => {
      const roleParam = activeTab === 'all' ? '' : `role=${activeTab}`;
      const response = await fetch(`${API_BASE}/api/admin/chat/conversations?${roleParam}`, {
        headers: { Authorization: `Bearer ${agentToken}` },
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
        headers: { Authorization: `Bearer ${agentToken}` },
      });
      if (!response.ok) throw new Error('Failed to load messages');
      return response.json();
    },
    enabled: !!activeUserId && !!agentToken,
    refetchInterval: 2500,
  });

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !activeUserId) return;
    const n = messages.length;
    if (n >= prevMsgCountRef.current || n === 0) el.scrollTop = el.scrollHeight;
    prevMsgCountRef.current = n;
  }, [messages, activeUserId, messagesLoading]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!activeUserId || !text.trim()) return;
      const response = await fetch(`${API_BASE}/api/admin/chat/${activeUserId}/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${agentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Failed to send');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeUserId] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat', activeTab] });
      setNewMsg('');
      setReplySnippet(null);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!activeUserId) throw new Error('No conversation');
      const response = await fetch(`${API_BASE}/api/admin/chat/${activeUserId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${agentToken}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeUserId] });
      toast.success('Ubutumwa bwasibwe');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  let adminCounter = 1;
  const adminMap = new Map<string, string>();
  const getAdminAlias = (user?: User) => {
    if (!user) return 'Unknown User';
    if (user.role === 'admin') {
      if (!adminMap.has(user._id)) adminMap.set(user._id, `Admin ${adminCounter++}`);
      return adminMap.get(user._id)!;
    }
    return user.name;
  };

  const uploadAndSendFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${agentToken}` },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        const isAudio = file.type.startsWith('audio/');
        const msgText = isAudio ? `[AUDIO](${data.imageUrl})` : `![Image](${data.imageUrl})`;
        await sendMutation.mutateAsync(msgText);
      }
    } catch {
      toast.error('Kohereza byanze');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await uploadAndSendFile(file);
  };

  const stopMediaStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startVoiceRecording = async () => {
    if (isRecording || !activeUserId || isUploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        stopMediaStream();
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (blob.size < 500) {
          toast.message("Ubutumwa bw'ijwi bufiye bugufi cyane");
          return;
        }
        const ext = blob.type.includes('webm') ? 'webm' : 'ogg';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
        await uploadAndSendFile(file);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      toast.message('Bika ubutumwa… sowa mikoro');
    } catch {
      toast.error('Ntibyashobotse kugera ku mikoro');
    }
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      setIsRecording(false);
      return;
    }
    try {
      mediaRecorderRef.current.stop();
    } finally {
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const openChat = (userId: string) => {
    prevMsgCountRef.current = 0;
    setActiveUserId(userId);
    queryClient.invalidateQueries({ queryKey: ['chat-messages', userId] });
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['admin-chat'] }), 500);
  };

  const closeChat = () => setActiveUserId(null);

  const submitMessage = () => {
    const raw = newMsg.trim();
    if (!raw) return;
    let text = raw;
    if (replySnippet) {
      const short = replySnippet.length > 100 ? `${replySnippet.slice(0, 100)}…` : replySnippet;
      text = `↩ "${short}"\n${raw}`;
    }
    sendMutation.mutate(text);
  };

  const filteredConvos = conversations.filter(
    (c) =>
      (getAdminAlias(c.user) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.user?.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUserData = conversations.find((c) => c.user?._id === activeUserId)?.user;
  const presence = activeUserData ? presenceSubtitle(activeUserData) : { label: '', dotClass: 'bg-slate-400' };

  const renderConversationItem = (conversation: Conversation) => {
    const u = conversation.user;
    const pres = u ? presenceSubtitle(u) : { label: '', dotClass: 'bg-slate-400' };
    const label = getAdminAlias(u);
    return (
      <div
        key={conversation.id}
        role="button"
        tabIndex={0}
        onClick={() => u?._id && openChat(u._id)}
        onKeyDown={(e) => e.key === 'Enter' && u?._id && openChat(u._id)}
        className={cn(
          'p-3 border-b cursor-pointer flex items-center gap-3 hover:bg-muted/50',
          activeUserId === u?._id ? 'bg-muted/60 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
        )}
      >
        <div className="relative shrink-0">
          <div
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm',
              activeUserId === u?._id ? 'bg-primary' : 'bg-slate-500'
            )}
          >
            {label?.charAt(0).toUpperCase() || 'U'}
          </div>
          {u?.recentlyActive && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
          {conversation.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#ff3040] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-background">
              {conversation.unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{u?.role === 'admin' ? <strong>{label}</strong> : label}</h3>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {new Date(conversation.lastTime).getTime() > 10000
                ? new Date(conversation.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{pres.label}</p>
          <p className={cn('text-xs truncate', conversation.unreadCount > 0 ? 'font-semibold' : 'text-muted-foreground')}>
            {messagePlainText(conversation.lastMessage || '')}
          </p>
        </div>
      </div>
    );
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
        >
          <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#ff3040] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-background">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[450px] max-w-full h-[88dvh] sm:h-[620px] max-h-[100dvh] flex flex-col bg-background sm:border shadow-2xl sm:rounded-2xl rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 sm:p-4 bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary-foreground/20 p-2 rounded-full shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold leading-tight truncate text-sm sm:text-base">Ubufasha — Chat</h1>
              <p className="text-[10px] sm:text-xs text-primary-foreground/80 font-medium truncate">Ubutumwa buhuye</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-background min-h-0">
          {!activeUserId ? (
            <div className="w-full flex flex-col h-full bg-muted/10 min-h-0">
              <div className="p-3 border-b bg-background shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Shakisha…"
                    className="pl-9 h-9 bg-muted/50 border-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); closeChat(); }} className="flex flex-col flex-1 min-h-0">
                <div className="px-2 pt-2 pb-2 border-b shrink-0 overflow-x-auto">
                  <TabsList className="grid w-full min-w-[260px] grid-cols-4 p-1 bg-muted/50 h-9">
                    <TabsTrigger value="all" className="text-[10px] font-semibold">Bose</TabsTrigger>
                    <TabsTrigger value="clients" className="text-[10px] font-semibold">Abakiliya</TabsTrigger>
                    <TabsTrigger value="admins" className="text-[10px] font-semibold">Abayobozi</TabsTrigger>
                    <TabsTrigger value="agents" className="text-[10px] font-semibold">Abakozi</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value={activeTab} className="flex-1 overflow-y-auto m-0 outline-none min-h-0">
                  {convLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                      <span className="text-xs">Turakurura…</span>
                    </div>
                  ) : filteredConvos.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mb-2 opacity-20 mx-auto" />
                      <span className="text-sm">Nta biganiro.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">{filteredConvos.map(renderConversationItem)}</div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="w-full flex flex-col bg-background h-full min-h-0">
              <div className="h-14 border-b bg-background flex items-center justify-between px-3 shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0 text-xs" onClick={closeChat}>
                    ← Urutonde
                  </Button>
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {getAdminAlias(activeUserData)?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-xs sm:text-sm leading-tight truncate">
                      {activeUserData?.role === 'admin' ? <strong>{getAdminAlias(activeUserData)}</strong> : getAdminAlias(activeUserData)}
                    </h2>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', presence.dotClass)} />
                      <span className="truncate">{presence.label}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 touch-pan-y">
                {messagesLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                    <p className="text-xs">Turapakurura…</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const sId = m.sender || m.senderId;
                    const isMine = String(sId) === String(agentId);
                    const plain = messagePlainText(m.text);
                    const imgUrl = extractImageUrlFromMessage(m.text);
                    const audioUrl = extractAudioUrlFromMessage(m.text);
                    return (
                      <div key={m._id || idx} className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'relative max-w-[min(90vw,85%)] px-3 py-2 rounded-2xl shadow-sm group/msg',
                            isMine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted border text-foreground rounded-tl-sm'
                          )}
                        >
                          <div className="absolute top-1 right-1 z-20">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'h-7 w-7 rounded-full flex items-center justify-center opacity-80 hover:opacity-100',
                                    isMine ? 'hover:bg-primary-foreground/15' : 'hover:bg-background/80'
                                  )}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(plain).then(() => toast.success('Byakopiye'));
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Kopiya
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setReplySnippet(plain);
                                    toast.message('Gusubiza');
                                  }}
                                >
                                  <Reply className="h-4 w-4 mr-2" />
                                  Subiza
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(`[Koherejwe] ${plain}`).then(() => toast.success('Byakopiye'));
                                  }}
                                >
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Kohereza (kopiya)
                                </DropdownMenuItem>
                                {isMine && m._id && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (window.confirm('Siba ubutumwa bwawe?')) deleteMessageMutation.mutate(m._id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Siba
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt=""
                              className="max-w-full rounded-lg mb-1 max-h-[200px] object-contain cursor-pointer pt-5"
                              onClick={() => setSelectedImageUrl(imgUrl)}
                            />
                          ) : audioUrl ? (
                            <VoiceNotePlayer src={audioUrl} isSent={isMine} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap pr-6 pt-1">{m.text}</p>
                          )}
                          <div className={cn('flex items-center gap-1 mt-1 text-[10px]', isMine ? 'justify-end opacity-90' : 'justify-start text-muted-foreground')}>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMine && <span>{m.isRead ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-background border-t shrink-0">
                {replySnippet && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg border bg-muted/40 px-2 py-1.5 text-[11px]">
                    <Reply className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p className="flex-1 truncate">{replySnippet}</p>
                    <button type="button" onClick={() => setReplySnippet(null)} className="p-0.5">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {isRecording && (
                  <p className="text-center text-[11px] text-red-600 font-semibold mb-1 animate-pulse">● Bika… sowa mikoro</p>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitMessage();
                  }}
                  className="flex gap-1.5 items-end"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  <input type="file" ref={audioInputRef} onChange={handleFileUpload} className="hidden" accept="audio/*" />
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0" disabled={isUploading || isRecording} onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('h-10 w-10 rounded-full shrink-0 touch-none', isRecording && 'bg-red-500/20 text-red-600')}
                    disabled={isUploading || sendMutation.isPending || messagesLoading}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      startVoiceRecording();
                    }}
                    onPointerUp={() => stopVoiceRecording()}
                    onPointerCancel={() => stopVoiceRecording()}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Andika…"
                    className="flex-1 h-10 rounded-full px-3 text-sm bg-muted/40 border-none"
                    disabled={sendMutation.isPending || messagesLoading || isUploading || isRecording}
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 rounded-full shrink-0" disabled={!newMsg.trim() || sendMutation.isPending || isUploading || isRecording}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" onClick={() => setSelectedImageUrl(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setSelectedImageUrl(null)}>
            <X className="h-6 w-6" />
          </Button>
          <img src={selectedImageUrl} alt="" className="max-w-full max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default AgentChat;
