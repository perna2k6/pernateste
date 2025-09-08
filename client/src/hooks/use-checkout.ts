import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type CheckoutForm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface TransactionResponse {
  success: boolean;
  data: {
    transactionId: string;
    unicId: string;
    status: string;
    qrCodeBase64: string;
    qrCodeText: string;
    paymentUrl: string;
  };
  message?: string;
}

interface Transaction {
  id: string;
  unicId: string;
  status: string;
  paymentData: {
    qrCodeBase64: string;
    qrCodeText: string;
    paymentUrl: string;
  };
}

export function useCheckout() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: CheckoutForm): Promise<TransactionResponse> => {
      const response = await apiRequest("POST", "/api/transactions/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setCurrentTransaction({
          id: data.data.transactionId,
          unicId: data.data.unicId,
          status: data.data.status,
          paymentData: {
            qrCodeBase64: data.data.qrCodeBase64,
            qrCodeText: data.data.qrCodeText,
            paymentUrl: data.data.paymentUrl,
          },
        });
        setError(null);
      } else {
        setError(data.message || "Erro ao criar transação");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      setCurrentTransaction(null);
    },
  });

  const checkPaymentStatusMutation = useMutation({
    mutationFn: async (unicId: string): Promise<string> => {
      const response = await apiRequest("GET", `/api/transactions/${unicId}/status`);
      const data = await response.json();
      return data.data.status;
    },
    onError: (error: Error) => {
      console.error("Error checking payment status:", error);
    },
  });

  const createTransaction = async (data: CheckoutForm): Promise<Transaction | null> => {
    try {
      const response = await createTransactionMutation.mutateAsync(data);
      if (response.success) {
        return {
          id: response.data.transactionId,
          unicId: response.data.unicId,
          status: response.data.status,
          paymentData: {
            qrCodeBase64: response.data.qrCodeBase64,
            qrCodeText: response.data.qrCodeText,
            paymentUrl: response.data.paymentUrl,
          },
        };
      }
      return null;
    } catch (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
  };

  const checkPaymentStatus = async (unicId: string): Promise<string> => {
    try {
      return await checkPaymentStatusMutation.mutateAsync(unicId);
    } catch (error) {
      console.error("Error checking payment status:", error);
      return "error";
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clearTransaction = () => {
    setCurrentTransaction(null);
  };

  return {
    createTransaction,
    checkPaymentStatus,
    currentTransaction,
    isCreating: createTransactionMutation.isPending,
    isChecking: checkPaymentStatusMutation.isPending,
    error,
    clearError,
    clearTransaction,
  };
}
