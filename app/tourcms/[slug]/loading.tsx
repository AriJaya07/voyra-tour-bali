import Container from "@/components/Container";

export default function Loading() {
  return (
    <Container className="">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[16/9] rounded-xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-10/12 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <aside className="lg:col-span-1">
          <div className="h-[420px] rounded-xl bg-gray-100 animate-pulse" />
        </aside>
      </div>
    </Container>
  );
}
