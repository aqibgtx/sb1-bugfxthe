import React from 'react';
import Card from '../../ui/Card';

const UploadInstructions: React.FC = () => {
  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Upload Instructions</h3>
      <div className="space-y-2 text-gray-700 text-sm">
        <p>• Upload clear photos or scanned copies of your payment receipts</p>
        <p>• Accepted formats: JPG, PNG, PDF (max 5MB)</p>
        <p>• Ensure the receipt shows the correct amount and booking reference</p>
        <p>• Your booking will be confirmed once payment is verified by our staff</p>
      </div>
    </Card>
  );
};

export default UploadInstructions;