import { useEffect, useState } from "react";
import { getPendingReportCount } from "@/services/offlineQueue";

export function usePendingReportCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const reportCount = await getPendingReportCount();
        setCount(reportCount);
      } catch (error) {
        console.error("Failed to load pending report count:", error);
      }
    };

    void loadCount();

    // Listen for offline sync events to update count
    const handleSyncComplete = () => {
      void loadCount();
    };
    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, []);

  return count;
}
