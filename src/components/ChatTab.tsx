import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

export const ChatTab = ({ conversationId }: { conversationId?: string }) => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const loadConversationById = async (id: string) => {
    if (!user) return;
    try {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('id', id)
        .single();

      if (convError || !conv) {
        toast.error('Failed to open conversation');
        return;
      }

      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (msgsError) {
        toast.error('Failed to load messages');
        return;
      }

      setConversation({ id: conv.id, title: conv.title, messages: (msgs || []) as Message[] });
    } catch (e) {
      console.error('Error loading conversation:', e);
      toast.error('Could not load conversation');
    }
  };

  useEffect(() => {
    if (conversationId) {
      loadConversationById(conversationId);
    } else {
      setConversation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  const createNewConversation = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation'
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create conversation');
      return null;
    }

    return data;
  };

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content
      });

    if (error) {
      console.error('Failed to save message:', error);
    }
  };

  const callChatAPI = async (userMessage: string, conversationId: string) => {
    // Primary: Supabase invoke
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: { message: userMessage, conversationId }
      });
      if (error) throw error;
      if (data?.response) return data.response as string;
      // Fall through to try direct call if response missing
    } catch (err) {
      console.error('Chat API invoke failed, trying direct URL:', err);
      // Fallback: direct fetch to Edge Function full URL (public function)
      try {
        const resp = await fetch('https://owzkyqwtnzximkrrqcoj.functions.supabase.co/chat-with-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, conversationId })
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Edge function HTTP ${resp.status}: ${text}`);
        }
        const json = await resp.json();
        if (json?.response) return json.response as string;
        throw new Error('No response from edge function');
      } catch (e2) {
        console.error('Direct edge function call failed:', e2);
        const msg = e2 instanceof Error ? e2.message : 'Failed to get AI response';
        throw new Error(msg);
      }
    }
    throw new Error('Unexpected: No response from chat API');
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    try {
      // Create conversation if it doesn't exist
      let currentConversation = conversation;
      if (!currentConversation) {
        const newConv = await createNewConversation();
        if (!newConv) return;
        currentConversation = { ...newConv, messages: [] };
        setConversation(currentConversation);
      }

      // Add user message to UI
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, userMsg]
      } : null);

      // Get AI response (the edge function handles saving messages)
      const aiResponse = await callChatAPI(userMessage, currentConversation.id);

      // Add AI response to UI
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString()
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMsg]
      } : null);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-96 border rounded-lg bg-muted/30 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!conversation?.messages.length ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary/60" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Ask me anything! I support both English and Arabic.</p>
            </div>
          ) : (
            conversation.messages.map((msg) => (
              <Card key={msg.id} className={`max-w-[80%] ${
                msg.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-card'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    {msg.role === 'assistant' ? (
                      <Bot className="h-4 w-4 mt-1 text-primary" />
                    ) : (
                      <User className="h-4 w-4 mt-1" />
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {loading && (
            <Card className="max-w-[80%] bg-card">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">AI is thinking...</p>
                </div>
              </CardContent>
            </Card>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex space-x-2">
        <Textarea
          placeholder="Type your message here... (supports Arabic & English)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 resize-none"
          rows={2}
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={!message.trim() || loading}
          className="px-6"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};