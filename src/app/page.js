import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white opacity-50"></div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <Image 
              src="/gtakpsi_logo.png" 
              alt="Alpha Kappa Psi Georgia Tech Logo" 
              width={300} 
              height={300}
              priority
              className="h-auto"
            />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1d1d1f] mb-4">
            Alpha Kappa Psi
          </h1>
          <p className="text-xl md:text-2xl font-medium tracking-tight text-[#1d1d1f] mb-2">
            Georgia Tech&apos;s Premier Professional Business Fraternity
          </p>
          <p className="text-lg text-[#6e6e73] max-w-2xl mx-auto mb-10">
            Building principled business leaders through professional development, brotherhood, and service since 1904.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/search" className="btn-apple">
              Search Resumes
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#1d1d1f] mb-4">
              Resume Repository
            </h2>
            <p className="text-lg text-[#6e6e73] max-w-3xl mx-auto">
              Connect with our talented members and discover the perfect candidate for your opportunity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                <svg className="w-6 h-6 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] text-center mb-3">Smart Search</h3>
              <p className="text-[#6e6e73] text-center">
                Find members by skills, major, graduation year, or previous companies with our intuitive search interface.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                <svg className="w-6 h-6 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] text-center mb-3">Resume Viewer</h3>
              <p className="text-[#6e6e73] text-center">
                Preview resumes directly in your browser or download them for future reference.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                <svg className="w-6 h-6 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] text-center mb-3">Diverse Talent</h3>
              <p className="text-[#6e6e73] text-center">
                Access a diverse pool of talented Georgia Tech students across various majors and industries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-[#6e6e73]">
              © {new Date().getFullYear()} Alpha Kappa Psi - Georgia Tech Chapter. All rights reserved.
            </p>
            <p className="text-xs text-[#86868b] mt-2">
              Alpha Kappa Psi is a registered trademark of Alpha Kappa Psi Fraternity.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
