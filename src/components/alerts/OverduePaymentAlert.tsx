import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, DollarSign, X, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface OverdueAlert {
  id: string;
  booking_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  days_overdue: number;
  amount_due: number;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

interface OverduePaymentAlertProps {
  alert: OverdueAlert;
  onAcknowledge: (alertId: string) => Promise<void>;
  onContactSupport?: () => void;
}

const OverduePaymentAlert: React.FC<OverduePaymentAlertProps> = ({
  alert,
  onAcknowledge,
  onContactSupport
}) => {
  const [acknowledging, setAcknowledging] = React.useState(false);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          text: 'text-red-800',
          icon: 'text-red-500'
        };
      case 'warning':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          icon: 'text-yellow-500'
        };
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          icon: 'text-blue-500'
        };
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await onAcknowledge(alert.id);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setAcknowledging(false);
    }
  };

  const styles = getSeverityStyles(alert.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4"
    >
      <Card className={`border-l-4 ${styles.border} ${styles.bg}`}>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <AlertTriangle className={`w-6 h-6 ${styles.icon} mt-0.5`} />
              <div className="flex-1">
                <h3 className={`font-semibold ${styles.text} mb-2`}>
                  {alert.title}
                </h3>
                <p className={`${styles.text} text-sm mb-4`}>
                  {alert.message}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-4 h-4 ${styles.icon}`} />
                    <span className={`text-sm font-medium ${styles.text}`}>
                      {alert.days_overdue} days overdue
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className={`w-4 h-4 ${styles.icon}`} />
                    <span className={`text-sm font-medium ${styles.text}`}>
                      RM {alert.amount_due.toFixed(2)} due
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                {!alert.acknowledged && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleAcknowledge}
                      disabled={acknowledging}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{acknowledging ? 'Acknowledging...' : 'Acknowledge'}</span>
                    </Button>
                    
                    {onContactSupport && (
                      <Button
                        onClick={onContactSupport}
                        variant="secondary"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <span>Contact Support</span>
                      </Button>
                    )}
                  </div>
                )}

                {alert.acknowledged && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Acknowledged</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default OverduePaymentAlert;