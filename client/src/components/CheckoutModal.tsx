import { useState, useEffect } from "react";
import { X, CreditCard, Check, Copy, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFormSchema, type CheckoutForm } from "@shared/schema";
import { useCheckout } from "@/hooks/use-checkout";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<CheckoutForm> | null;
}

type CheckoutStep = "form" | "payment" | "pix" | "success" | "error";

export default function CheckoutModal({ isOpen, onClose, initialData }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("form");
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 minutes
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const { toast } = useToast();
  const {
    createTransaction,
    checkPaymentStatus,
    currentTransaction,
    isCreating,
    isChecking,
    error,
    clearError,
  } = useCheckout();

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: "",
      email: "",
      document: "",
      phone: "",
      plan: initialData?.plan || "",
      price: initialData?.price || 0,
      title: initialData?.title || "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.setValue("plan", initialData.plan || "");
      form.setValue("price", initialData.price || 0);
      form.setValue("title", initialData.title || "");
    }
  }, [initialData, form]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep("form");
      setPaymentTimer(900);
      clearError();
    }
  }, [isOpen, clearError]);

  // Payment timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === "pix" && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer(prev => {
          if (prev <= 1) {
            setCurrentStep("error");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, paymentTimer]);

  // Payment status polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === "pix" && currentTransaction?.unicId) {
      interval = setInterval(async () => {
        try {
          const status = await checkPaymentStatus(currentTransaction.unicId);
          if (status === "paid") {
            setCurrentStep("success");
            toast({
              title: "Pagamento Aprovado!",
              description: "Seu acesso foi liberado com sucesso",
            });
          } else if (status === "failed" || status === "cancelled") {
            setCurrentStep("error");
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentStep, currentTransaction, checkPaymentStatus, toast]);

  const onSubmit = async (data: CheckoutForm) => {
    try {
      setCurrentStep("payment");
      const transaction = await createTransaction(data);
      
      if (transaction) {
        setCurrentStep("pix");
        toast({
          title: "PIX Gerado",
          description: "Escaneie o QR Code ou copie o código para pagar",
        });
      }
    } catch (error) {
      setCurrentStep("error");
      toast({
        title: "Erro",
        description: "Erro ao gerar pagamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
    if (match) {
      return [match[1], match[2], match[3], match[4]]
        .filter(Boolean)
        .join(".")
        .replace(/\.(\d{2})$/, "-$1");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
    if (match) {
      const formatted = [match[1], match[2], match[3]]
        .filter(Boolean)
        .join(" ")
        .replace(/^(\d{2})/, "($1)")
        .replace(/(\d{5})$/, " $1");
      return formatted.replace(/ (\d{4})$/, "-$1");
    }
    return value;
  };

  const copyPixCode = async () => {
    if (currentTransaction?.paymentData?.qrCodeText) {
      try {
        await navigator.clipboard.writeText(currentTransaction.paymentData.qrCodeText);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        toast({
          title: "Código copiado!",
          description: "Cole no seu app de pagamentos",
        });
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Tente copiar manualmente",
          variant: "destructive",
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setCurrentStep("form");
    setPaymentTimer(900);
    clearError();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="modal-backdrop fixed inset-0" 
        onClick={handleClose}
        data-testid="modal-backdrop"
      />
      
      {/* Modal Content */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-4 sm:max-w-lg sm:mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <Card className="rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] flex flex-col slide-up active">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl sm:rounded-t-xl">
            <h3 className="text-lg font-semibold text-foreground">
              {currentStep === "form" && "Finalizar Pagamento"}
              {currentStep === "payment" && "Método de Pagamento"}
              {currentStep === "pix" && "Pagamento PIX"}
              {currentStep === "success" && "Pagamento Aprovado!"}
              {currentStep === "error" && "Erro no Pagamento"}
            </h3>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClose}
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Plan Summary */}
          <div className="px-6 py-4 bg-muted/50 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground" data-testid="text-plan-title">
                  {initialData?.title || "Plano Selecionado"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {initialData?.plan === "annual" ? "Acesso completo por 12 meses" : "Acesso completo por 30 dias"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-foreground" data-testid="text-plan-price">
                  R$ {((initialData?.price || 0) / 100).toFixed(2).replace('.', ',')}
                </div>
                <div className="text-xs text-muted-foreground">Pagamento único</div>
              </div>
            </div>
          </div>

          <CardContent className="p-6 overflow-y-auto flex-1">
            {/* Step 1: User Information Form */}
            {currentStep === "form" && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-4">Suas Informações</h4>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite seu nome completo"
                                data-testid="input-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Digite seu e-mail"
                                data-testid="input-email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00"
                                maxLength={14}
                                data-testid="input-document"
                                value={formatCPF(field.value)}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                                data-testid="input-phone"
                                value={formatPhone(field.value)}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-white"
                    disabled={isCreating}
                    data-testid="button-continue-payment"
                  >
                    {isCreating ? "Processando..." : "Continuar para Pagamento"}
                  </Button>
                </form>
              </Form>
            )}

            {/* Step 2: Payment Method Selection */}
            {currentStep === "payment" && (
              <div>
                <div className="mb-6">
                  <h4 className="font-medium text-foreground mb-4">Método de Pagamento</h4>
                  
                  <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h5 className="font-medium text-foreground">PIX</h5>
                        <p className="text-sm text-muted-foreground">Pagamento instantâneo e seguro</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700 font-medium">✓ Aprovação imediata</span>
                      <span className="text-green-700 font-medium">✓ Sem taxas extras</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="loading-spinner mx-auto mb-4" />
                  <h4 className="font-medium text-foreground mb-2">Gerando pagamento PIX...</h4>
                  <p className="text-sm text-muted-foreground">Aguarde um momento</p>
                </div>
              </div>
            )}

            {/* Step 3: PIX Payment Display */}
            {currentStep === "pix" && currentTransaction && (
              <div>
                <div className="text-center mb-6">
                  <h4 className="font-medium text-foreground mb-2">PIX Copia e Cola</h4>
                  <p className="text-sm text-muted-foreground">Copie o código e cole no seu app de pagamentos</p>
                </div>

                {/* Informação PIX */}
                <div className="qr-code-container p-6 rounded-xl border-2 border-dashed border-border mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h4 className="font-medium text-foreground mb-2">PIX Copia e Cola</h4>
                    <p className="text-sm text-muted-foreground">Use o código abaixo no seu app de pagamentos</p>
                  </div>
                </div>

                {/* PIX Copy Code */}
                {currentTransaction.paymentData?.qrCodeText && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ou copie o código PIX:
                    </label>
                    <div className="flex gap-2">
                      <Input 
                        value={currentTransaction.paymentData.qrCodeText}
                        readOnly
                        className="flex-1 bg-muted text-sm"
                        data-testid="input-pix-code"
                      />
                      <Button 
                        onClick={copyPixCode}
                        variant="default"
                        className="px-4"
                        data-testid="button-copy-pix"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    {copyFeedback && (
                      <div className="mt-2 text-center">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          ✓ Código copiado!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Status */}
                <div className="text-center p-4 border border-border rounded-lg status-pending">
                  <div className="pulse-animation mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full mx-auto flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">Aguardando pagamento...</h4>
                  <p className="text-sm text-muted-foreground">O status será atualizado automaticamente</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    Transação: <span className="font-mono" data-testid="text-transaction-id">
                      {String(currentTransaction.unicId)?.substring(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Payment Timer */}
                <div className="text-center mt-4">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    PIX expira em: <span className="font-medium" data-testid="text-payment-timer">
                      {formatTime(paymentTimer)}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Success State */}
            {currentStep === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 status-success rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-2">Pagamento Aprovado!</h4>
                <p className="text-muted-foreground mb-6">Seu acesso foi liberado com sucesso</p>
                <Button 
                  onClick={handleClose}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  data-testid="button-access-content"
                >
                  Acessar Conteúdo
                </Button>
              </div>
            )}

            {/* Step 5: Error State */}
            {currentStep === "error" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 status-error rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-2">Erro no Pagamento</h4>
                <p className="text-muted-foreground mb-6" data-testid="text-error-message">
                  {error || "PIX expirado ou erro no processamento. Tente novamente."}
                </p>
                <Button 
                  onClick={() => setCurrentStep("form")}
                  variant="default"
                  data-testid="button-try-again"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>

          {/* Bulls Pay Branding */}
          <div className="px-6 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span>Pagamento seguro processado por</span>
              <span className="font-semibold text-orange-600">Bulls Pay</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
