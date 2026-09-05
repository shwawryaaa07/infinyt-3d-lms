import React from 'react';
import { FileText } from 'lucide-react';
import { resolveMediaPath } from '../video/VideoPlayer';

interface PdfViewerProps {
  mediaPath?: string;
  title?: string;
  onComplete?: () => void;
  isCompleted?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  mediaPath,
  title = 'Technical Document'
}) => {
  const resolvedPdfUrl = resolveMediaPath(mediaPath);
  const isRealPdfAttached = Boolean(
    mediaPath &&
    (mediaPath.toLowerCase().includes('.pdf') ||
     mediaPath.startsWith('blob:') ||
     mediaPath.startsWith('data:application/pdf'))
  );

  if (isRealPdfAttached && resolvedPdfUrl) {
    return (
      <div className="w-full h-[680px] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <iframe
          src={resolvedPdfUrl}
          className="w-full h-full border-0"
          title={title || 'Technical Document'}
        />
      </div>
    );
  }

  // Clean empty state when no PDF is attached
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col items-center justify-center h-[480px] p-8 text-center space-y-4 font-sans">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-sm">
        <FileText className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold text-slate-900 font-poppins">{title}</h3>
        <p className="text-xs text-slate-500">
          No PDF document is attached to this unit. Attach a local .pdf document in the Instructor Studio to display technical datasheets and manuals.
        </p>
      </div>
    </div>
  );
};

