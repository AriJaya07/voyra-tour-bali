"use client";

import { useDestinations } from "@/utils/hooks/useDestinations";

export default function DestinationsPage() {
  const { data, isLoading: loading, createDestination, deleteDestination } =
    useDestinations();

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Destinations</h1>

      <button
        onClick={() =>
          createDestination({
            name: "New Beach",
            location: "Indonesia",
            description: "Amazing place",
          })
        }
      >
        Add Destination
      </button>

      {data.map((item: any) => (
        <div key={item.id}>
          <h2>{item.name}</h2>
          <button onClick={() => deleteDestination(item.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}