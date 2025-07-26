import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';

interface ViewTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

const ViewTermsModal: React.FC<ViewTermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false
}) => {
  const [terms, setTerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLatestTerms();
    }
  }, [isOpen]);

  const loadLatestTerms = async () => {
    try {
      setLoading(true);
      
      // Fetch the latest terms and conditions
      const { data, error } = await supabase
        .from('terms_and_conditions')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading terms:', error);
        // Use default terms if database doesn't have any
        setTerms({
          version: '1.0',
          content: getDefaultTermsContent(),
          last_updated: new Date().toISOString()
        });
      } else if (data) {
        setTerms(data);
      } else {
        // No terms found, use default
        setTerms({
          version: '1.0',
          content: getDefaultTermsContent(),
          last_updated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading terms:', error);
      // Fallback to default terms
      setTerms({
        version: '1.0',
        content: getDefaultTermsContent(),
        last_updated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTermsContent = () => {
    return `
<h2>Terms and Conditions - Budget Plus Rental</h2>

<h3>1. Rental Agreement</h3>
<p>By renting a vehicle from Budget Plus Rental, you agree to these terms and conditions. This agreement is binding upon signature or acceptance of the rental.</p>

<h3>2. Driver Requirements</h3>
<ul>
  <li>Must be at least 21 years old</li>
  <li>Must possess a valid driving license</li>
  <li>Must provide valid identification (IC/Passport)</li>
  <li>Must have clean driving record</li>
</ul>

<h3>3. Vehicle Use</h3>
<ul>
  <li>Vehicle must be used for lawful purposes only</li>
  <li>No smoking in vehicles</li>
  <li>No pets allowed unless pre-approved</li>
  <li>Maximum occupancy as per vehicle specifications</li>
  <li>Vehicle must not be used for racing, towing, or off-road driving</li>
</ul>

<h3>4. Payment Terms</h3>
<ul>
  <li>Full payment required before vehicle collection</li>
  <li>Security deposit may be required</li>
  <li>Late return fees: 10% of daily rate per hour</li>
  <li>Fuel must be returned at same level as pickup</li>
</ul>

<h3>5. Insurance and Liability</h3>
<ul>
  <li>Basic insurance coverage included</li>
  <li>Renter liable for damages not covered by insurance</li>
  <li>Renter responsible for traffic violations and fines</li>
  <li>Report accidents immediately to authorities and Budget Plus Rental</li>
</ul>

<h3>6. Vehicle Return</h3>
<ul>
  <li>Vehicle must be returned on time and in same condition</li>
  <li>Late returns subject to additional charges</li>
  <li>Cleaning fees apply for excessive dirt or damage</li>
  <li>Return inspection will be conducted</li>
</ul>

<h3>7. Cancellation Policy</h3>
<ul>
  <li>Cancellations must be made at least 24 hours in advance</li>
  <li>Cancellation fees may apply</li>
  <li>No-shows forfeit full payment</li>
  <li>Weather-related cancellations handled case by case</li>
</ul>

<h3>8. Prohibited Uses</h3>
<ul>
  <li>Subletting or unauthorized use by third parties</li>
  <li>Transportation of illegal substances</li>
  <li>Use while under influence of alcohol or drugs</li>
  <li>Reckless or negligent driving</li>
</ul>

<h3>9. Breakdown and Emergency</h3>
<ul>
  <li>Contact Budget Plus Rental immediately for breakdowns</li>
  <li>Do not attempt repairs yourself</li>
  <li>Emergency contact: +60 12-345 6789</li>
  <li>24/7 roadside assistance available</li>
</ul>

<h3>10. Privacy and Data</h3>
<ul>
  <li>Personal information collected for rental purposes only</li>
  <li>Data protected according to Malaysian privacy laws</li>
  <li>Information may be shared with authorities if required</li>
</ul>

<h3>11. Dispute Resolution</h3>
<ul>
  <li>Disputes resolved through Malaysian courts</li>
  <li>Mediation preferred before legal action</li>
  <li>Governing law: Malaysian law</li>
</ul>

<h3>12. Amendments</h3>
<p>Budget Plus Rental reserves the right to modify these terms. Updated terms will be posted on our website and take effect immediately.</p>

<h3>Contact Information</h3>
<p>
  Budget Plus Rental<br>
  Kuala Lumpur, Malaysia<br>
  Phone: +60 12-345 6789<br>
  Email: info@budgetplusrental.com
</p>

<p><strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-MY')}</p>
    `;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card glass>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2>
                {terms && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Version {terms.version}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Updated: {new Date(terms.last_updated).toLocaleDateString('en-MY')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div 
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: terms?.content || '' }}
                style={{
                  lineHeight: '1.6',
                }}
              />
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Close
            </Button>
            {showAcceptButton && onAccept && (
              <Button
                onClick={onAccept}
                className="px-6"
              >
                I Accept These Terms
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default ViewTermsModal;