export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-4 w-96 bg-muted rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}