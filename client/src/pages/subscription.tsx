import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import SubscriptionPlans from "@/components/ui/subscription-plans";
import { Button } from "@/components/ui/button";

export default function SubscriptionPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a Dashboard
          </Button>
        </Link>
      </div>
      <SubscriptionPlans />
    </div>
  );
}