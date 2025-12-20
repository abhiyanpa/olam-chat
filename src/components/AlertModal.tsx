import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type: 'success' | 'error';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  message,
  type,
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`rounded-lg p-4 flex items-center space-x-2 ${
          type === 'success' ? 'bg-green-900' : 'bg-red-900'
        } text-white shadow-lg`}
      >
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
        <p>{message}</p>
      </div>
    </div>
  );
};