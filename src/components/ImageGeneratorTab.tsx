import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ImageGeneratorTab = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const generateImage = async () => {
    if (!prompt.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim(), userId: user.id }
      });

      if (error) throw error;

      const imageUrl = data.image;
      setGeneratedImage(imageUrl);

      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Image generation error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to generate image.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Textarea
          placeholder="Describe the image you want to generate... (e.g., 'A beautiful sunset over mountains with purple clouds')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px]"
          rows={4}
        />
        
        <Button 
          onClick={generateImage} 
          disabled={!prompt.trim() || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Image...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>
      </div>

      {/* Generated Image Display */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          {generatedImage ? (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={generatedImage}
                  alt="Generated AI image"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Prompt: "{prompt}"
                </p>
                <Button onClick={downloadImage} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                No image generated yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Enter a prompt above and click generate to create your AI image
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};