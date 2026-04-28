import Container from "@/components/Container";

export default function Loading() {
  return (
    <Container className="">
      <div className="py-10">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    </Container>
  );
}
