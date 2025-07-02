export function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold text-red-200 mb-2">Error Loading Data</h3>
      <p className="text-red-300 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}