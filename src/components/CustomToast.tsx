import React from 'react';

interface CustomToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const CustomToast: React.FC<CustomToastProps> = ({
  isOpen,
  onClose,
  message,
  type,
  duration = 3000
}) => {
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border border-green-200',
          icon: 'text-green-600',
          text: 'text-green-800',
          closeButton: 'text-green-600 hover:bg-green-100'
        };
      case 'error':
        return {
          container: 'bg-red-50 border border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          closeButton: 'text-red-600 hover:bg-red-100'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
          closeButton: 'text-blue-600 hover:bg-blue-100'
        };
      default:
        return {
          container: 'bg-gray-50 border border-gray-200',
          icon: 'text-gray-600',
          text: 'text-gray-800',
          closeButton: 'text-gray-600 hover:bg-gray-100'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const styles = getToastStyles();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4">
      <div className={`${styles.container} rounded-lg shadow-lg p-4 flex items-start space-x-3`}>
        <div className={`${styles.icon} flex-shrink-0 mt-0.5`}>
          {getIcon()}
        </div>
        <div className={`${styles.text} flex-1 text-sm font-medium`}>
          {message}
        </div>
        <button
          onClick={onClose}
          className={`${styles.closeButton} flex-shrink-0 p-1 rounded-md transition-colors duration-200`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CustomToast;