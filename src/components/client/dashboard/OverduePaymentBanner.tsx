import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, DollarSign, Phone, Mail } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import OverduePaymentAlert from '../../alerts/OverduePaymentAlert';

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

interface OverduePaymentBannerProps {
  alerts: OverdueAlert[];
  onAcknowledge: (alertId: string) => Promise<void>;
}

const OverduePaymentBanner: React.FC<OverduePaymentBannerProps> = ({
  alerts,
  onAcknowledge
}) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const totalAmountDue = alerts.reduce((sum, alert) => sum + alert.amount_due, 0);
  const maxDaysOverdue = Math.max(...alerts.map(alert => alert.days_overdue));

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Urgent: Overdue Rental Payment');
    const body = encodeURIComponent(
      `Dear Support Team,\n\nI have overdue rental payments that require immediate attention. Please contact me to arrange payment.\n\nTotal Amount Due: RM ${totalAmountDue.toFixed(2)}\nDays Overdue: ${maxDaysOverdue}\n\nThank you.`
    );
    window.location.href = `mailto:support@budgetplusrental.com?subject=${subject}&body=${body}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <Card className="border-l-4 border-red-500 bg-red-50">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-red-800 font-bold text-lg">URGENT: Payment Required</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-red-800 font-semibold">{maxDaysOverdue} Days Overdue</p>
                    <p className="text-red-600 text-sm">Immediate action required</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-red-800 font-semibold">RM {totalAmountDue.toFixed(2)}</p>
                    <p className="text-red-600 text-sm">Total amount due</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-red-800 font-semibold">{alerts.length} Alert{alerts.length > 1 ? 's' : ''}</p>
                    <p className="text-red-600 text-sm">Requires attention</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm font-medium">
                  Your rental period has expired and payment is overdue. Please contact us immediately to avoid additional charges or legal action.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleContactSupport}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 mobile-button"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Support Now</span>
                </Button>
                
                <Button
                  onClick={() => window.location.href = 'tel:+60123456789'}
                  variant="secondary"
                  className="flex items-center space-x-2 mobile-button"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call: +60 12-345 6789</span>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Individual Alert Cards */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <OverduePaymentAlert
            key={alert.id}
            alert={alert}
            onAcknowledge={onAcknowledge}
            onContactSupport={handleContactSupport}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default OverduePaymentBanner;