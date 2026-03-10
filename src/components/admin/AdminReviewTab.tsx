import { ListChecks, ThumbsUp, ThumbsDown, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminReviewTabProps {
  reviewQueue: any[] | undefined;
  onAction: (params: { id: string; itemType: string; action: "approve" | "reject" | "rescan" }) => void;
}

export default function AdminReviewTab({ reviewQueue, onAction }: AdminReviewTabProps) {
  return (
    <div className="p-5 rounded-2xl bg-secondary">
      <div className="flex items-center gap-2 mb-4">
        <ListChecks className="w-5 h-5 text-amber-500" />
        <h2 className="font-semibold">Review Queue — Items pendientes de revisión</h2>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 font-medium">
          {reviewQueue?.length ?? 0} items
        </span>
      </div>
      {(!reviewQueue || reviewQueue.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-8">✓ No hay items pendientes de revisión</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {reviewQueue.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 text-sm py-3 px-4 rounded-lg bg-background/50">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                item.verdict === "MALICIOUS" ? "bg-destructive text-destructive-foreground" :
                item.verdict === "SUSPICIOUS" ? "bg-amber-500/20 text-amber-600" :
                "bg-muted text-muted-foreground"
              }`}>{item.verdict}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{item.item_type}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
              </div>
              {item.security_scan_result?.layers?.dependencies?.vulnerabilities?.length > 0 && (
                <span className="text-xs text-destructive font-medium">
                  {item.security_scan_result.layers.dependencies.vulnerabilities.length} CVEs
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10"
                  onClick={() => onAction({ id: item.id, itemType: item.item_type, action: "approve" })} title="Aprobar">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => onAction({ id: item.id, itemType: item.item_type, action: "reject" })} title="Rechazar">
                  <ThumbsDown className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted"
                  onClick={() => onAction({ id: item.id, itemType: item.item_type, action: "rescan" })} title="Re-escanear">
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
