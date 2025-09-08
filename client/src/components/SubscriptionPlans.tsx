import { Crown, Zap, Sparkles } from "lucide-react";
import { type CheckoutForm } from "@shared/schema";

interface SubscriptionPlansProps {
  onPlanSelect: (plan: Partial<CheckoutForm>) => void;
}

export default function SubscriptionPlans({ onPlanSelect }: SubscriptionPlansProps) {
  const handlePlanSelect = (plan: string, price: number, title: string) => {
    onPlanSelect({
      plan,
      price,
      title,
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6 mt-8">
      <div className="pt-2 mb-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Mel Maia</h1>
        <p className="text-sm text-muted-foreground mb-3">@melmaia</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Conteúdo exclusivo e especial. Acesso VIP aos meus melhores momentos e bastidores únicos. 
          ✨ Seja parte do meu mundo privado!
        </p>
      </div>

      <h3 className="text-lg font-medium text-foreground mb-4">Planos de Assinatura</h3>
      
      {/* Primary Plan */}
      <button 
        onClick={() => handlePlanSelect("premium", 2990, "Acesso VIP - Mensal")}
        className="w-full mb-3 h-14 px-6 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 hover:shadow-lg text-white rounded-lg font-medium transition-all hover:scale-[1.02] group"
        data-testid="button-plan-premium"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Acesso VIP - Mensal</div>
              <div className="text-xs opacity-90">Conteúdo exclusivo completo</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">R$ 29,90</div>
            <div className="text-xs opacity-75">por mês</div>
          </div>
        </div>
      </button>

      {/* Secondary Plan */}
      <button 
        onClick={() => handlePlanSelect("basic", 1990, "Acesso Básico - Mensal")}
        className="w-full mb-3 h-14 px-6 bg-white border-2 border-orange-200 hover:bg-orange-50 text-gray-800 rounded-lg font-medium transition-all hover:scale-[1.02] hover:shadow-lg"
        data-testid="button-plan-basic"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Acesso Básico - Mensal</div>
              <div className="text-xs text-muted-foreground">Conteúdo selecionado</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">R$ 19,90</div>
            <div className="text-xs text-muted-foreground">por mês</div>
          </div>
        </div>
      </button>

      {/* Special Offer */}
      <div className="bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 rounded-lg p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
            🔥 Oferta Especial
          </span>
        </div>
        <button 
          onClick={() => handlePlanSelect("annual", 29900, "Plano Anual VIP")}
          className="w-full h-12 px-4 bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all hover:scale-[1.02] hover:shadow-lg"
          data-testid="button-plan-annual"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium">Plano Anual VIP</div>
                <div className="text-xs opacity-90">Economize 17% • 12 meses</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">R$ 299,00</div>
              <div className="text-xs opacity-75 line-through">R$ 358,80</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
