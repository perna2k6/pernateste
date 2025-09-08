import { useState } from "react";
import ProfileSection from "@/components/ProfileSection";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import ContentPreview from "@/components/ContentPreview";
import CheckoutModal from "@/components/CheckoutModal";
import { type CheckoutForm } from "@shared/schema";

export default function Home() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Partial<CheckoutForm> | null>(null);

  const handleOpenCheckout = (plan: Partial<CheckoutForm>) => {
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setSelectedPlan(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-center">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">MM</span>
            </div>
            <span className="ml-2 font-semibold text-lg">Mel Maia</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProfileSection />
        <SubscriptionPlans onPlanSelect={handleOpenCheckout} />
        <ContentPreview />
      </main>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={handleCloseCheckout}
        initialData={selectedPlan}
      />
    </div>
  );
}
