"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ResumeCard from "@/components/resume/ResumeCard";
import { debounce } from "@/lib/utils";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    major: [],
    company: [],
    graduationYear: [],
  });
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration (will be replaced with API calls later)
  const mockMajors = ["Computer Science", "Business", "Marketing", "Finance", "Economics"];
  const mockCompanies = ["Google", "Amazon", "Microsoft", "Apple", "Facebook"];
  const mockYears = ["2023", "2024", "2025"];
  
  const mockResumes = [
    {
      id: 1,
      name: "John Doe",
      major: "Computer Science",
      graduationYear: "2023",
      companies: ["Google", "Microsoft"],
      keywords: ["Python", "Machine Learning", "Cloud Computing", "Data Science", "Artificial Intelligence", "Neural Networks"],
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    },
    {
      id: 2,
      name: "Jane Smith",
      major: "Business",
      graduationYear: "2024",
      companies: ["Amazon", "Facebook"],
      keywords: ["Marketing", "Social Media", "Analytics", "Project Management"],
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    },
    {
      id: 3,
      name: "Alex Johnson",
      major: "Finance",
      graduationYear: "2023",
      companies: ["Goldman Sachs", "JP Morgan"],
      keywords: ["Investment Banking", "Financial Analysis", "Excel", "Financial Modeling", "Valuation"],
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    },
    {
      id: 4,
      name: "Sarah Williams",
      major: "Marketing",
      graduationYear: "2024",
      companies: ["Apple", "Nike"],
      keywords: ["Digital Marketing", "Brand Strategy", "Content Creation", "Social Media Management"],
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    },
    {
      id: 5,
      name: "Michael Brown",
      major: "Computer Science",
      graduationYear: "2025",
      companies: ["Microsoft", "IBM"],
      keywords: ["JavaScript", "React", "Node.js", "Full Stack Development", "Web Development"],
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    },
  ];

  // Use state to store filtered resumes
  const [filteredResumes, setFilteredResumes] = useState(mockResumes);

  // Filter resumes based on search query and filters
  const filterResumes = () => {
    setLoading(true);
    
    const filtered = mockResumes.filter((resume) => {
      // Search query filtering
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = resume.name.toLowerCase().includes(query);
        const majorMatch = resume.major.toLowerCase().includes(query);
        const companyMatch = resume.companies.some(company => 
          company.toLowerCase().includes(query)
        );
        const keywordMatch = resume.keywords.some(keyword => 
          keyword.toLowerCase().includes(query)
        );
        
        if (!(nameMatch || majorMatch || companyMatch || keywordMatch)) {
          return false;
        }
      }
      
      // Filter by major
      if (filters.major.length > 0 && !filters.major.includes(resume.major)) {
        return false;
      }
      
      // Filter by company
      if (filters.company.length > 0 && 
          !resume.companies.some(company => filters.company.includes(company))) {
        return false;
      }
      
      // Filter by graduation year
      if (filters.graduationYear.length > 0 && 
          !filters.graduationYear.includes(resume.graduationYear)) {
        return false;
      }
      
      return true;
    });
    
    setFilteredResumes(filtered);
    setLoading(false);
  };

  // Debounced version of filterResumes to avoid excessive filtering on input changes
  const debouncedFilterResumes = debounce(filterResumes, 300);

  // Apply filters whenever search query or filters change
  useEffect(() => {
    debouncedFilterResumes();
  }, [searchQuery, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      const currentValues = [...prevFilters[filterType]];
      
      if (currentValues.includes(value)) {
        // Remove the value if it's already selected
        return {
          ...prevFilters,
          [filterType]: currentValues.filter(v => v !== value)
        };
      } else {
        // Add the value if it's not already selected
        return {
          ...prevFilters,
          [filterType]: [...currentValues, value]
        };
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 hover:text-indigo-900">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8">
          Search Resumes
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="font-medium text-lg mb-4">Filters</h2>
            
            <div className="mb-6">
              <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">Major</h3>
              {mockMajors.map(major => (
                <div key={major} className="flex items-center mb-2">
                  <input
                    id={`major-${major}`}
                    name={`major-${major}`}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.major.includes(major)}
                    onChange={() => handleFilterChange('major', major)}
                  />
                  <label htmlFor={`major-${major}`} className="ml-2 text-sm text-gray-700">
                    {major}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">Company</h3>
              {mockCompanies.map(company => (
                <div key={company} className="flex items-center mb-2">
                  <input
                    id={`company-${company}`}
                    name={`company-${company}`}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.company.includes(company)}
                    onChange={() => handleFilterChange('company', company)}
                  />
                  <label htmlFor={`company-${company}`} className="ml-2 text-sm text-gray-700">
                    {company}
                  </label>
                </div>
              ))}
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">Graduation Year</h3>
              {mockYears.map(year => (
                <div key={year} className="flex items-center mb-2">
                  <input
                    id={`year-${year}`}
                    name={`year-${year}`}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.graduationYear.includes(year)}
                    onChange={() => handleFilterChange('graduationYear', year)}
                  />
                  <label htmlFor={`year-${year}`} className="ml-2 text-sm text-gray-700">
                    {year}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Search and Results */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  className="block w-full pr-10 py-3 text-base rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                  placeholder="Search by name, major, company, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Results */}
            <div>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : filteredResumes.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Found {filteredResumes.length} resume{filteredResumes.length !== 1 ? 's' : ''}
                  </p>
                  {filteredResumes.map(resume => (
                    <ResumeCard key={resume.id} resume={resume} />
                  ))}
                </>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center text-gray-500">
                  No matching resumes found. Try adjusting your search or filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 