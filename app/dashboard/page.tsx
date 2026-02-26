"use client";

import DestinationForm from "@/components/Dashboard/DestinationForm";
import DestinationTable from "@/components/Dashboard/DestinationTable";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useDestinations } from "@/utils/hooks/useDestinations";

export default function DashboardPage() {
  const { data: destinations, isLoading, createDestination, deleteDestination } = useDestinations();

  return (
    <div className="flex">
      <Sidebar />
      <div className="w-full p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <DestinationForm onSubmit={createDestination} />
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <DestinationTable destinations={destinations} onDelete={deleteDestination} />
        )}
      </div>
    </div>
  );
}
