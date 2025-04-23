"use client";

import { useState } from "react";
import Link from "next/link";
import { formatGraduationYear, truncateString } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import PdfViewer to avoid SSR issues
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  ),
});

export default function ResumeCard({ resume }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  if (!resume) return null;

  const { id, name, major, graduationYear, companies, keywords, pdfUrl } = resume;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const togglePdfView = () => {
    setShowPdf(!showPdf);
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-4">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-indigo-600 truncate">{name}</h3>
          <div className="ml-2 flex-shrink-0 flex">
            <button
              onClick={togglePdfView}
              className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {showPdf ? "Hide PDF" : "View PDF"}
            </button>
          </div>
        </div>
        
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <p className="flex items-center text-sm text-gray-500">
              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {major}
            </p>
            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatGraduationYear(graduationYear)}
            </p>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Companies:</span> {companies.join(", ")}
          </p>
          
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">Keywords:</span>{" "}
              {isExpanded 
                ? keywords.join(", ")
                : truncateString(keywords.join(", "), 80)}
            </p>
            
            {keywords.length > 0 && keywords.join(", ").length > 80 && (
              <button
                onClick={toggleExpand}
                className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none"
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* PDF Viewer */}
      {showPdf && (
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
          <PdfViewer pdfUrl={pdfUrl} />
        </div>
      )}
    </div>
  );
} 