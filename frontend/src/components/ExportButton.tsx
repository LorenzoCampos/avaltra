import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from './ui/Button';

interface ExportButtonProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  disabled?: boolean;
}

export const ExportButton = ({ onExportCSV, onExportPDF, disabled }: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportCSV = () => {
    onExportCSV();
    setIsOpen(false);
  };

  const handleExportPDF = () => {
    onExportPDF();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
          <div className="py-1">
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
              <Table className="w-4 h-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium">Export CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">For Excel/Sheets</p>
              </div>
            </button>
            
            <button
              onClick={handleExportPDF}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium">Export PDF</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">For printing</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
