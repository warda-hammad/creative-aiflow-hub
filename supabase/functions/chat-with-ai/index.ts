import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log('Chat function called:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();
    console.log('Request payload:', { message: message?.substring(0, 50), conversationId });
    
    if (!message || !conversationId) {
      throw new Error('Message and conversationId are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    // Save user message
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });

    if (insertError) {
      console.error('Error saving user message:', insertError);
      throw insertError;
    }

    // Build conversation context
    const conversationHistory = messages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];
    conversationHistory.push({ role: 'user', content: message });

    let aiResponse = '';

    try {
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      console.log('Calling Lovable AI Gateway');
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // model: 'google/gemini-2.5-flash', // default model
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant in the AI Creative Hub. Be creative, helpful, and engaging. Support both English and Arabic languages.' },
            ...conversationHistory
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiResponse = data.choices?.[0]?.message?.content || '';
        console.log('Lovable AI response received');
      } else if (response.status === 429) {
        aiResponse = 'Rate limit reached. Please wait a moment and try again.';
        console.error('Lovable AI rate limit (429)');
      } else if (response.status === 402) {
        aiResponse = 'Payment required for AI usage. Please add credits to your Lovable workspace.';
        console.error('Lovable AI payment required (402)');
      } else {
        const t = await response.text();
        console.error('Lovable AI error:', response.status, t);
      }
    } catch (error) {
      console.error('Lovable AI call failed:', error);
    }

    if (!aiResponse) {
      aiResponse = 'I apologize, but I cannot generate a response right now. Please make sure your API keys are configured properly.';
    }

    // Save AI response
    const { error: aiInsertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse
      });

    if (aiInsertError) {
      console.error('Error saving AI message:', aiInsertError);
      throw aiInsertError;
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log('Chat request completed successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});