'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-background border-t border-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center space-x-2 text-gray-500">
          <span>Copyright © {currentYear} RepoMonitor • Maintained by Tyler Hughes</span>
        </div>
      </div>
    </footer>
  );
}