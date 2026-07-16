import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResetCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (startDate: string) => void | Promise<void>;
  defaultStartDate?: string;
}

export function ResetCycleModal({
  open,
  onOpenChange,
  onConfirm,
  defaultStartDate,
}: ResetCycleModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const value = defaultStartDate ?? today;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            איפוס מחזור טיפול
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            כל הנתונים על המחזור הנוכחי יימחקו והמטופל יתחיל מחזור טיפול חדש.
            בחר/י את תאריך ההתחלה של המחזור החדש.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="reset-start">
            תאריך התחלת טיפול
          </label>
          <Input
            id="reset-start"
            type="date"
            defaultValue={value}
            className="h-11 rounded-xl bg-background"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm((e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
        <DialogFooter className="mt-2 flex-row-reverse gap-2 sm:flex-row-reverse">
          <Button
            variant="destructive"
            className="rounded-full px-6"
            onClick={() => {
              const el = document.getElementById(
                "reset-start",
              ) as HTMLInputElement | null;
              onConfirm(el?.value ?? value);
            }}
          >
            אפס והתחל מחזור
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
