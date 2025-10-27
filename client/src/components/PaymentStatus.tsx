// src/components/PaymentStatus.tsx - REFACTORED VERSION
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  CreditCard
} from "lucide-react";
import { useState } from "react";

export interface PaymentStatusData {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency?: string;
  payment_method: string;
  created_at: string;
  updated_at?: string;
  transaction_id?: string;
  failure_reason?: string;
  order_id?: number;
  customer_phone?: string;
}

interface PaymentStatusProps {
  payment: PaymentStatusData;
  onRetry?: (paymentId: number) => void;
  onViewDetails?: (paymentId: number) => void;
  showActions?: boolean;
  className?: string;
}

const PaymentStatus = ({ 
  payment, 
  onRetry, 
  onViewDetails, 
  showActions = true,
  className = ""
}: PaymentStatusProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statusConfig = {
    pending: {
      label: 'Pending',
      icon: Clock,
      variant: 'secondary' as const,
      description: 'Waiting for payment confirmation',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    },
    processing: {
      label: 'Processing',
      icon: RefreshCw,
      variant: 'default' as const,
      description: 'Payment is being processed',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle,
      variant: 'default' as const,
      description: 'Payment successfully completed',
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    failed: {
      label: 'Failed',
      icon: XCircle,
      variant: 'destructive' as const,
      description: 'Payment failed',
      color: 'text-red-600 bg-red-50 border-red-200'
    },
    cancelled: {
      label: 'Cancelled',
      icon: XCircle,
      variant: 'destructive' as const,
      description: 'Payment was cancelled',
      color: 'text-gray-600 bg-gray-50 border-gray-200'
    }
  };

  const config = statusConfig[payment.status] || statusConfig.pending;
  const Icon = config.icon;

  const handleRetry = async () => {
    if (onRetry) {
      setIsRefreshing(true);
      try {
        await onRetry(payment.id);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(payment.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Payment #{payment.id}</h3>
            {payment.order_id && (
              <p className="text-sm text-muted-foreground">
                Order #: {payment.order_id}
              </p>
            )}
          </div>
          <Badge 
            variant={config.variant} 
            className={`flex items-center gap-1 ${config.color}`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <DetailItem 
              label="Amount" 
              value={formatAmount(payment.amount, payment.currency)} 
            />
            <DetailItem 
              label="Payment Method" 
              value={payment.payment_method.toUpperCase()} 
            />
            {payment.customer_phone && (
              <DetailItem 
                label="Phone Number" 
                value={payment.customer_phone} 
              />
            )}
          </div>
          <div className="space-y-2">
            <DetailItem 
              label="Created" 
              value={formatDate(payment.created_at)} 
            />
            {payment.updated_at && (
              <DetailItem 
                label="Last Updated" 
                value={formatDate(payment.updated_at)} 
              />
            )}
            {payment.transaction_id && (
              <DetailItem 
                label="Transaction ID" 
                value={payment.transaction_id} 
                canCopy
              />
            )}
          </div>
        </div>

        {/* Status Description */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{config.description}</span>
        </div>

        {/* Failure Reason */}
        {payment.failure_reason && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Failure Reason:</strong> {payment.failure_reason}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {(payment.status === 'failed' || payment.status === 'cancelled') && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Retrying...' : 'Retry Payment'}
              </Button>
            )}
            
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
            
            {payment.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking...' : 'Check Status'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// Sub-component for detail items
interface DetailItemProps {
  label: string;
  value: string;
  canCopy?: boolean;
}

const DetailItem = ({ label, value, canCopy = false }: DetailItemProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    // You might want to add a toast notification here
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-right">{value}</span>
        {canCopy && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
          >
            <CreditCard className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Loading state component
export const PaymentStatusSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-32"></div>
          <div className="h-4 bg-muted rounded w-24"></div>
        </div>
        <div className="h-6 bg-muted rounded w-20"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SkeletonDetail />
          <SkeletonDetail />
        </div>
        <div className="space-y-2">
          <SkeletonDetail />
          <SkeletonDetail />
        </div>
      </div>
      <div className="h-4 bg-muted rounded w-48"></div>
    </div>
  </Card>
);

const SkeletonDetail = () => (
  <div className="flex justify-between">
    <div className="h-4 bg-muted rounded w-20"></div>
    <div className="h-4 bg-muted rounded w-24"></div>
  </div>
);

export default PaymentStatus;