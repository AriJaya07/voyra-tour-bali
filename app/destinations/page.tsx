"use client";

import { useDestinations } from "@/utils/hooks/useDestinations";

export default function DestinationsPage() {
  const { data, isLoading: loading, deleteDestination } =
    useDestinations();

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Destinations</h1>

      {data.map((item) => (
        <div key={item.id}>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <button onClick={() => deleteDestination(item.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
