import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Github, Globe } from 'lucide-react';

const Info = () => (
  <div className="max-w-2xl mx-auto py-10 space-y-8">
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">How to Use Jeffy AI</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-gray-700 text-lg">
        <ul className="list-disc pl-6 space-y-2">
          <li>Sign up or log in with your email or Google account.</li>
          <li>Add your workout sets manually or use the voice input feature for quick logging.</li>
          <li>Group and edit your sets by muscle group and exercise for easy tracking.</li>
          <li>Customize your exercise knowledge base to match your personal routine.</li>
          <li>Review your workout history by selecting any date on the dashboard.</li>
          <li>For best results, use workout names that match your personal exercise knowledge base, and always specify the weight, number of sets, and reps.</li>
        </ul>
      </CardContent>
    </Card>
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Security & Privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-gray-700 text-lg">
        <ul className="list-disc pl-6 space-y-2">
          <li>Your workout data is securely stored in a private Supabase database.</li>
          <li>Authentication is handled via secure OAuth and password-based login.</li>
          <li>Voice recordings are processed securely and never stored after transcription.</li>
          <li>All sensitive keys and credentials are kept server-side and never exposed to the client.</li>
          <li>You can delete your data at any time from your account settings.</li>
        </ul>
      </CardContent>
    </Card>
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">About the Creator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-gray-700 text-lg">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Creator Logo" className="h-16 w-16 rounded-full border-2 border-purple-300" />
          <div>
            <div className="font-semibold text-xl">Orijeet Mukherjee</div>
            <div className="text-gray-500">AI/ML Engineer</div>
            <div className="flex gap-3 mt-2">
              <Button asChild variant="outline" size="icon"><a href="https://www.linkedin.com/in/orijeet-mukherjee/" target="_blank" rel="noopener noreferrer"><Linkedin className="h-5 w-5" /></a></Button>
              <Button asChild variant="outline" size="icon"><a href="https://github.com/orijeet100" target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5" /></a></Button>
              <Button asChild variant="outline" size="icon"><a href="https://orijeet100.github.io/orijeet_portfolio/" target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5" /></a></Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Info; 