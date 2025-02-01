import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, Users, Globe, Shield } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';

export const Home = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'register'>('register');
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGetStarted = () => {
    setAuthType('register');
    setShowAuthModal(true);
  };

  return (
    <>
      <Helmet>
        <title>Olam Chat - Secure Real-Time Messaging Platform</title>
        <meta
          name="description"
          content="Experience secure, real-time messaging with Olam Chat. Connect instantly with users worldwide through our modern, encrypted chat platform."
        />
        <meta name="keywords" content="Olam Chat, secure messaging, instant messaging app, real-time chat, private chat software, best messaging app" />
        <meta property="og:title" content="Olam Chat - Secure Real-Time Messaging Platform" />
        <meta property="og:description" content="Experience secure, real-time messaging with Olam Chat. Connect instantly with users worldwide." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Olam Chat - Secure Real-Time Messaging Platform" />
        <meta name="twitter:description" content="Experience secure, real-time messaging with Olam Chat. Connect instantly with users worldwide." />
        <link rel="canonical" href="https://olamchat.com" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Olam Chat",
            "applicationCategory": "CommunicationApplication",
            "operatingSystem": "Web",
            "description": "Secure real-time messaging platform for instant communication",
            "offers": {
              "@type": "Offer",
              "price": "0"
            }
          })}
        </script>
      </Helmet>

      <main className="bg-gray-900 text-white min-h-screen">
        <section className="relative py-20" aria-labelledby="hero-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold mb-6">
                Connect Globally,{' '}
                <span className="text-primary-400">Chat Instantly</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Experience secure, real-time communication with people around the world.
                Join our growing community and start chatting today.
              </p>
              <button 
                onClick={handleGetStarted}
                className="px-8 py-3 bg-primary-600 hover:bg-primary-700 rounded-full text-lg font-semibold transition-colors transform hover:scale-105 duration-200"
                aria-label="Get Started with Olam Chat"
              >
                Get Started
              </button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-800" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="features-heading" className="sr-only">Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<MessageSquare className="h-12 w-12 text-primary-400" />}
                title="Real-time Chat"
                description="Experience seamless, instant messaging with crystal-clear communication."
              />
              <FeatureCard
                icon={<Shield className="h-12 w-12 text-primary-400" />}
                title="Secure Messaging"
                description="End-to-end encryption ensures your conversations stay private."
              />
              <FeatureCard
                icon={<Globe className="h-12 w-12 text-primary-400" />}
                title="Global Connect"
                description="Break language barriers and connect with people worldwide."
              />
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 py-8" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <MessageSquare className="h-8 w-8 text-primary-400" />
                <span className="text-xl font-bold">Olam Chat</span>
              </div>
              <p className="text-gray-400">
                © {new Date().getFullYear()} Olam Chat. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        type={authType}
      />
    </>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <article className="bg-gray-900 p-6 rounded-lg text-center">
      <div className="flex justify-center mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </article>
  );
};