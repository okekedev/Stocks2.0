export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      <span className="ml-3 text-gray-400">Loading latest market news...</span>
    </div>
  );
}