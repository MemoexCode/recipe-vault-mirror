import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";

export default function BatchQueuePanel({ queue, currentIndex }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-500 text-white">Fertig</Badge>;
      case "processing":
        return <Badge className="bg-blue-500 text-white">Aktiv</Badge>;
      case "error":
        return <Badge variant="destructive">Fehler</Badge>;
      default:
        return <Badge variant="outline">Wartend</Badge>;
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm sticky top-4">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Batch-Queue ({queue.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-4 max-h-[600px] overflow-y-auto">
        <div className="space-y-3">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                index === currentIndex
                  ? "border-blue-500 bg-blue-50"
                  : item.status === "complete"
                  ? "border-green-300 bg-green-50"
                  : item.status === "error"
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(item.status)}
                    {item.progress > 0 && item.status !== "complete" && (
                      <span className="text-xs text-gray-500">{item.progress}%</span>
                    )}
                  </div>
                  {item.error && (
                    <p className="text-xs text-red-600 mt-2">{item.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}