import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface DepositPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
  deposit: {
    id: string;
    name: string;
    amount: string;
    date: string;
    screenshot?: string;
  } | null;
}

const DepositPreviewDialog = ({ open, onOpenChange, deposit, onApprove, onReject, isProcessing }: DepositPreviewProps) => {
  if (!deposit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Proof - {deposit.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">User</p>
              <p className="font-medium text-foreground">{deposit.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium text-foreground">{deposit.amount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium text-foreground">{deposit.date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-warning">Pending Review</p>
            </div>
          </div>

          {/* Deposit proof image display */}
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-muted/20 relative group">
            {deposit.screenshot ? (
              <div className="relative">
                <img 
                  src={deposit.screenshot} 
                  alt="Payment Proof" 
                  className="w-full h-auto max-h-[400px] object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <a 
                    href={deposit.screenshot} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                   >
                     View Full Resolution
                   </a>
                </div>
              </div>
            ) : (
              <div className="h-48 w-full bg-secondary/50 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Proof not uploaded</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-tighter">The user has not attached a screenshot for this node.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" 
                variant="default" 
                onClick={onApprove}
                disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve
            </Button>
            <Button 
                className="flex-1 gap-2" 
                variant="destructive" 
                onClick={onReject}
                disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositPreviewDialog;
