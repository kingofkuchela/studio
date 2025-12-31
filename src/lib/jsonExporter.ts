
import type { LogicalEdgeFlow } from '@/types';

export const exportLogicalFlowsToJson = (flows: LogicalEdgeFlow[]): void => {
  try {
    const jsonString = JSON.stringify(flows, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `tradevision_logical_flows_backup_${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export logical flows to JSON:", error);
    // You might want to show a toast notification here in a real app
    alert("An error occurred during the export process. See the console for details.");
  }
};
