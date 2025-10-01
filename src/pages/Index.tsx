import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, MessageSquare, Image, Zap } from 'lucide-react';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Creative Hub
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Unleash your creativity with AI-powered content generation. 
              Chat with advanced AI models and create stunning images from text descriptions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
                Get Started
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
                <CardTitle>AI Chat</CardTitle>
                <CardDescription>
                  Intelligent conversations with advanced AI that understands both English and Arabic
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-accent/20 hover:border-accent/40 transition-colors">
              <CardHeader>
                <Image className="h-10 w-10 text-accent mx-auto mb-4" />
                <CardTitle>Image Generation</CardTitle>
                <CardDescription>
                  Create stunning, unique images from simple text descriptions using AI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
                <CardTitle>Project History</CardTitle>
                <CardDescription>
                  Keep track of all your conversations and generated images in one place
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Create?</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Join thousands of creators using AI to bring their ideas to life
              </p>
              <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
                Start Creating Now
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
