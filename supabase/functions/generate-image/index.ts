import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userId } = await req.json();
    
    if (!prompt || !userId) {
      throw new Error('Prompt and userId are required');
    }

    console.log('Processing image generation request:', { prompt, userId });

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating image via Lovable AI Gateway');
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('Lovable AI error:', aiRes.status, t);
      throw new Error(`Lovable AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const imageDataUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) {
      throw new Error('No image returned from Lovable AI');
    }

    console.log('Image generated successfully via Lovable AI');

    // Save to database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: generatedImage, error: insertError } = await supabase
      .from('generated_images')
      .insert({
        user_id: userId,
        prompt: prompt,
        image_url: imageDataUrl,
        file_name: `generated-${Date.now()}.png`
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving generated image:', insertError);
      throw insertError;
    }

    console.log('Image saved to database successfully');

    return new Response(JSON.stringify({ 
      image: imageDataUrl,
      id: generatedImage.id,
      prompt: prompt,
      created_at: generatedImage.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-image function:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});