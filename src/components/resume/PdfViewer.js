"use client";

import { useState } from "react";

export default function PdfViewer({ pdfUrl }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const handleIframeLoad = () => {
    setLoading(false);
  };
  
  const handleIframeError = () => {
    setError(true);
    setLoading(false);
  };
  
  return (
    <div className="pdf-viewer-container w-full h-full">
      {loading && (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0071e3]"></div>
        </div>
      )}
      
      {error && (
        <div className="flex justify-center items-center h-96">
          <div className="text-[#ff3b30] text-center">
            <p className="text-xl font-semibold">Failed to load PDF</p>
            <p className="mt-2">Please try again later or contact support</p>
          </div>
        </div>
      )}
      
      <div className={loading ? "hidden" : ""}>
        <iframe
          src={pdfUrl}
          className="w-full h-[70vh] border-0"
          title="Resume PDF Viewer"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>
      
      <div className="mt-4 pb-4 text-center">
        <a 
          href={pdfUrl} 
          download
          className="text-[#0071e3] hover:text-[#0077ed] font-medium px-4 py-2 rounded-full border border-[#d2d2d7] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
} 