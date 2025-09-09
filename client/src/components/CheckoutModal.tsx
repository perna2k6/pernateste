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
import QRCode from 'qrcode';

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  
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

  // Generate QR Code when PIX code is available
  useEffect(() => {
    const generateQRCode = async () => {
      const pixCode = currentTransaction?.paymentData?.qrCodeText;
      console.log('Generating QR Code for PIX:', pixCode ? 'Code exists' : 'No code');
      
      if (pixCode) {
        try {
          const dataUrl = await QRCode.toDataURL(pixCode, {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });
          console.log('QR Code generated successfully');
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
          setQrCodeDataUrl(null);
        }
      } else {
        setQrCodeDataUrl(null);
      }
    };
    
    // Add a small delay to ensure the transaction data is fully loaded
    if (currentStep === 'pix' && currentTransaction) {
      const timer = setTimeout(generateQRCode, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentTransaction]);

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
    setQrCodeDataUrl(null);
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
          <div className="sticky top-0 bg-gradient-to-r from-white to-gray-50 border-b border-border px-6 py-5 flex items-center justify-between rounded-t-xl sm:rounded-t-xl shadow-sm">
            <div className="flex items-center gap-3">
              {currentStep === "form" && <CreditCard className="w-6 h-6 text-orange-500" />}
              {currentStep === "payment" && <div className="w-6 h-6 bg-orange-500 rounded-full animate-pulse" />}
              {currentStep === "pix" && <CheckCircle className="w-6 h-6 text-green-500" />}
              {currentStep === "success" && <CheckCircle className="w-6 h-6 text-green-500" />}
              {currentStep === "error" && <AlertCircle className="w-6 h-6 text-red-500" />}
              
              <h3 className="text-xl font-bold text-foreground">
                {currentStep === "form" && "Finalizar Pagamento"}
                {currentStep === "payment" && "Processando..."}
                {currentStep === "pix" && "PIX Gerado"}
                {currentStep === "success" && "Pagamento Aprovado!"}
                {currentStep === "error" && "Erro no Pagamento"}
              </h3>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-gray-100"
              onClick={handleClose}
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Plan Summary */}
          <div className="px-6 py-6 bg-gradient-to-r from-orange-50 to-pink-50 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-400 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-foreground" data-testid="text-plan-title">
                    {initialData?.title || "Plano Selecionado"}
                  </h4>
                  <p className="text-sm text-muted-foreground font-medium">
                    {initialData?.plan === "annual" ? "Acesso completo por 12 meses" : "Acesso completo por 30 dias"}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Acesso imediato após pagamento
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground" data-testid="text-plan-price">
                  R$ {((initialData?.price || 0) / 100).toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Pagamento único</div>
                <div className="text-xs text-green-600 font-medium">✓ Sem mensalidades</div>
              </div>
            </div>
          </div>

          <CardContent className="p-6 overflow-y-auto flex-1">
            {/* Step 1: User Information Form */}
            {currentStep === "form" && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="mb-8">
                    <div className="text-center mb-6">
                      <h4 className="font-semibold text-xl text-foreground mb-2">Dados para Pagamento</h4>
                      <p className="text-sm text-muted-foreground">Preencha seus dados para finalizar a compra</p>
                    </div>
                    
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite seu nome completo"
                                className="h-12 rounded-xl border-2 focus:border-orange-400 transition-colors"
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
                                className="h-12 rounded-xl border-2 focus:border-orange-400 transition-colors"
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
                                className="h-12 rounded-xl border-2 focus:border-orange-400 transition-colors"
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
                                className="h-12 rounded-xl border-2 focus:border-orange-400 transition-colors"
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

                  <div className="space-y-4 pt-4">
                    <Button 
                      type="submit" 
                      className="w-full gradient-primary text-white font-semibold py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isCreating}
                      data-testid="button-continue-payment"
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Continuar para Pagamento
                        </div>
                      )}
                    </Button>
                    
                    <div className="text-center text-xs text-muted-foreground">
                      Pagamento seguro e criptografado
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 2: Payment Method Selection */}
            {currentStep === "payment" && (
              <div className="py-8">
                <div className="text-center mb-8">
                  <h4 className="font-semibold text-2xl text-foreground mb-2">Método de Pagamento</h4>
                  <p className="text-muted-foreground">Processando seu pagamento PIX</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 rounded-2xl p-6 mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-lg text-foreground">PIX Selecionado</h5>
                      <p className="text-green-700 font-medium">Pagamento instantâneo e seguro</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Aprovação imediata</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Sem taxas extras</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">100% seguro</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Disponível 24h</span>
                    </div>
                  </div>
                </div>

                <div className="text-center bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h4 className="font-semibold text-xl text-foreground mb-2">Gerando seu PIX...</h4>
                  <p className="text-muted-foreground">Aguarde um momento enquanto processamos</p>
                </div>
              </div>
            )}

            {/* Step 3: PIX Payment Display */}
            {currentStep === "pix" && currentTransaction && (
              <div className="py-4">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <h4 className="font-bold text-2xl text-foreground mb-2">PIX Gerado com Sucesso!</h4>
                  <p className="text-muted-foreground">Escaneie o QR Code ou copie o código PIX para pagar</p>
                </div>

                {/* Debug Info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
                    <div>Step: {currentStep}</div>
                    <div>Transaction exists: {currentTransaction ? 'Yes' : 'No'}</div>
                    <div>PIX Code exists: {currentTransaction?.paymentData?.qrCodeText ? 'Yes' : 'No'}</div>
                    <div>QR DataURL exists: {qrCodeDataUrl ? 'Yes' : 'No'}</div>
                  </div>
                )}

                {/* QR Code Section */}
                <div className="mb-8">
                  <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <div className="text-center mb-4">
                      <h5 className="font-semibold text-lg text-foreground mb-1">QR Code PIX</h5>
                      <p className="text-sm text-muted-foreground">Escaneie com o app do seu banco</p>
                    </div>
                    
                    <div className="flex justify-center mb-4">
                      {qrCodeDataUrl ? (
                        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner">
                          <img 
                            src={qrCodeDataUrl}
                            alt="QR Code PIX"
                            className="w-64 h-64 mx-auto"
                            data-testid="qr-code-image"
                            onLoad={() => console.log('QR Code image loaded')}
                            onError={() => console.log('QR Code image failed to load')}
                          />
                        </div>
                      ) : currentTransaction?.paymentData?.qrCodeText ? (
                        <div className="w-64 h-64 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-spin">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                            </div>
                            <p className="text-sm text-blue-600 font-medium">Gerando QR Code...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-64 h-64 bg-gray-50 rounded-2xl border-2 border-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aguardando dados PIX...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-green-700 font-medium">📱 Abra o app do seu banco e escaneie este código</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PIX Copy Code */}
                {currentTransaction.paymentData?.qrCodeText && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                      <div className="text-center mb-4">
                        <h5 className="font-semibold text-lg text-foreground mb-1">Código PIX</h5>
                        <p className="text-sm text-muted-foreground">Ou copie e cole no seu app de pagamentos</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                          <div className="text-xs text-muted-foreground mb-2 font-medium">Código PIX:</div>
                          <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm break-all text-gray-700">
                            {currentTransaction.paymentData.qrCodeText}
                          </div>
                        </div>
                        
                        <Button 
                          onClick={copyPixCode}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200"
                          data-testid="button-copy-pix"
                        >
                          <Copy className="w-5 h-5 mr-2" />
                          Copiar Código PIX
                        </Button>
                        
                        {copyFeedback && (
                          <div className="text-center animate-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-green-500 text-white text-sm px-4 py-2 rounded-full inline-flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Código copiado com sucesso!
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Status */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-orange-200 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center animate-pulse">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Clock className="w-3 h-3 text-yellow-800" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-foreground mb-1">Aguardando pagamento...</h4>
                      <p className="text-sm text-muted-foreground mb-2">Detectaremos automaticamente quando o pagamento for realizado</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>ID: <span className="font-mono" data-testid="text-transaction-id">
                            {String(currentTransaction.unicId)?.substring(0, 8)}...
                          </span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Timer */}
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-muted-foreground">Expira em:</span>
                      <span className="font-mono font-bold text-orange-600" data-testid="text-payment-timer">
                        {formatTime(paymentTimer)}
                      </span>
                    </div>
                  </div>
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
