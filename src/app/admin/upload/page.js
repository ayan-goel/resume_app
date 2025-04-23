"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { resumeAPI } from "@/lib/api";
import Link from "next/link";
import AdminWrapper from "@/components/ui/AdminWrapper";

export default function UploadPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: "",
    major: "",
    graduationYear: "",
    companies: "",
    keywords: "",
  });
  
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Redirect if not admin
  if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
    router.push("/auth/login");
    return null;
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Validate file type (PDF only)
    if (selectedFile && selectedFile.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      setFile(null);
      e.target.value = null; // Reset the input
      return;
    }
    
    setFile(selectedFile);
    setError("");
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Validate form
    if (!formData.name || !formData.major || !formData.graduationYear || !file) {
      setError("All fields are required.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await resumeAPI.create(formData, file);
      
      // Reset form on success
      setFormData({
        name: "",
        major: "",
        graduationYear: "",
        companies: "",
        keywords: "",
      });
      setFile(null);
      setSuccess("Resume uploaded successfully!");
      
      // Reset file input
      const fileInput = document.getElementById("pdfFile");
      if (fileInput) fileInput.value = "";
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Failed to upload resume. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 hover:text-indigo-900">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8">
          Upload Resume
        </h1>
        
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                      Student Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="major" className="block text-sm font-medium">
                      Major
                    </label>
                    <input
                      id="major"
                      name="major"
                      type="text"
                      required
                      value={formData.major}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="graduationYear" className="block text-sm font-medium">
                      Graduation Year
                    </label>
                    <input
                      id="graduationYear"
                      name="graduationYear"
                      type="text"
                      required
                      value={formData.graduationYear}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      placeholder="e.g. 2023"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="pdfFile" className="block text-sm font-medium">
                      Resume PDF
                    </label>
                    <input
                      id="pdfFile"
                      name="pdfFile"
                      type="file"
                      accept="application/pdf"
                      required
                      onChange={handleFileChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? "Uploading..." : "Upload Resume"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtectedUploadPage() {
  return (
    <AdminWrapper>
      <UploadPage />
    </AdminWrapper>
  );
} 