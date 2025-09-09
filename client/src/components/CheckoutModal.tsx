import { useState, useEffect, useRef } from "react";
import { X, CreditCard, Copy, Clock, CheckCircle, AlertCircle, Smartphone, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFormSchema, type CheckoutForm } from "@shared/schema";
import { useCheckout } from "@/hooks/use-checkout";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import QRCode from 'qrcode';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<CheckoutForm> | null;
}

type CheckoutStep = "form" | "processing" | "success" | "error";

export default function CheckoutModal({ isOpen, onClose, initialData }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("form");
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 minutes
  const [copyFeedback, setCopyFeedback] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const { toast } = useToast();
  const {
    createTransaction,
    checkPaymentStatus,
    currentTransaction,
    isCreating,
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

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      form.setValue("plan", initialData.plan || "");
      form.setValue("price", initialData.price || 0);
      form.setValue("title", initialData.title || "");
    }
  }, [initialData, form]);

  // Reset on modal open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("form");
      setPaymentTimer(900);
      setCopyFeedback(false);
      clearError();
    }
  }, [isOpen, clearError]);

  // Payment timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === "success" && paymentTimer > 0) {
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
    if (currentStep === "success" && currentTransaction?.unicId) {
      interval = setInterval(async () => {
        try {
          const status = await checkPaymentStatus(currentTransaction.unicId);
          if (status === "paid") {
            clearInterval(interval);
            toast({
              title: "🎉 Pagamento Confirmado!",
              description: "Seu acesso foi liberado com sucesso!",
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

  // Generate QR Code
  useEffect(() => {
    const generateQR = async () => {
      if (currentStep === "success" && currentTransaction?.paymentData?.qrCodeText && qrCanvasRef.current) {
        try {
          await QRCode.toCanvas(qrCanvasRef.current, currentTransaction.paymentData.qrCodeText, {
            width: 280,
            margin: 3,
            color: {
              dark: '#1f2937',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
        } catch (error) {
          console.error('QR Code generation failed:', error);
        }
      }
    };
    generateQR();
  }, [currentStep, currentTransaction]);

  const onSubmit = async (data: CheckoutForm) => {
    setCurrentStep("processing");
    
    try {
      const transaction = await createTransaction(data);
      
      if (transaction?.paymentData?.qrCodeText) {
        setCurrentStep("success");
        toast({
          title: "PIX Gerado!",
          description: "Escaneie o QR Code ou copie o código para pagar",
        });
      } else {
        throw new Error("Falha ao gerar dados PIX");
      }
    } catch (error) {
      setCurrentStep("error");
      toast({
        title: "Erro no Pagamento",
        description: "Não foi possível gerar o PIX. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const copyPixCode = async () => {
    if (currentTransaction?.paymentData?.qrCodeText) {
      try {
        await navigator.clipboard.writeText(currentTransaction.paymentData.qrCodeText);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 3000);
        toast({
          title: "Código Copiado!",
          description: "Cole no seu app de pagamentos",
        });
      } catch (error) {
        toast({
          title: "Erro ao Copiar",
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
    setCopyFeedback(false);
    clearError();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="relative">
            {/* STEP 1: FORM */}
            {currentStep === "form" && (
              <div className="p-6 pb-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Finalizar Assinatura</h2>
                  <p className="text-gray-600">{initialData?.title}</p>
                </div>

                {/* Price Card */}
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-4 mb-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Valor total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        R$ {((initialData?.price || 0) / 100).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-600 font-medium">✓ Pagamento único</p>
                      <p className="text-xs text-green-600">✓ Acesso imediato</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Nome Completo</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Seu nome completo"
                              className="h-12 rounded-xl border-2 border-gray-200 focus:border-orange-400 transition-colors"
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
                          <FormLabel className="text-sm font-medium text-gray-700">E-mail</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="seu@email.com"
                              className="h-12 rounded-xl border-2 border-gray-200 focus:border-orange-400 transition-colors"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">CPF</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00"
                                maxLength={14}
                                className="h-12 rounded-xl border-2 border-gray-200 focus:border-orange-400 transition-colors"
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
                            <FormLabel className="text-sm font-medium text-gray-700">Telefone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                                className="h-12 rounded-xl border-2 border-gray-200 focus:border-orange-400 transition-colors"
                                value={formatPhone(field.value)}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-14 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg mt-6"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          Pagar com PIX
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      )}
                    </Button>
                    
                    <p className="text-center text-xs text-gray-500 mt-4">
                      🔒 Pagamento seguro e criptografado
                    </p>
                  </form>
                </Form>
              </div>
            )}

            {/* STEP 2: PROCESSING */}
            {currentStep === "processing" && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Gerando seu PIX...</h2>
                <p className="text-gray-600">Aguarde enquanto processamos seu pagamento</p>
                
                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3 text-blue-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Dados validados com sucesso</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS (PIX) */}
            {currentStep === "success" && currentTransaction && (
              <div className="p-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">PIX Gerado!</h2>
                  <p className="text-gray-600">Escaneie ou copie o código para pagar</p>
                </div>

                {/* QR Code */}
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-inner mb-6">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-gray-900 mb-1">QR Code PIX</h3>
                    <p className="text-sm text-gray-600">Abra seu app do banco e escaneie</p>
                  </div>
                  
                  <div className="flex justify-center mb-4">
                    <canvas 
                      ref={qrCanvasRef}
                      className="border border-gray-200 rounded-lg"
                    />
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                    <Smartphone className="w-4 h-4" />
                    <span>Use a câmera do seu celular</span>
                  </div>
                </div>

                {/* PIX Code */}
                {currentTransaction.paymentData?.qrCodeText && (
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 mb-3">
                      <p className="text-xs text-gray-600 mb-2 font-medium">Código PIX (Copia e Cola):</p>
                      <div className="bg-white rounded-lg p-3 border font-mono text-xs break-all text-gray-700">
                        {currentTransaction.paymentData.qrCodeText}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={copyPixCode}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copyFeedback ? "✓ Copiado!" : "Copiar Código PIX"}
                    </Button>
                  </div>
                )}

                {/* Timer */}
                <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
                  <div className="flex items-center justify-center gap-2 text-orange-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Expira em: <span className="font-mono">{formatTime(paymentTimer)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">Será atualizado automaticamente após pagamento</p>
                </div>
              </div>
            )}

            {/* STEP 4: ERROR */}
            {currentStep === "error" && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Algo deu errado</h2>
                <p className="text-gray-600 mb-6">
                  {error || "PIX expirado ou erro no processamento"}
                </p>
                <Button 
                  onClick={() => setCurrentStep("form")}
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <CreditCard className="w-4 h-4" />
              <span>Pagamento processado por</span>
              <span className="font-semibold text-orange-600">Bulls Pay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}