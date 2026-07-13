import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmResetModal({ open, onOpenChange, onConfirm }: ConfirmResetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">איפוס יומן הטיפול</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            הפעולה תמחק את כל הנתונים המקומיים של היומן שלך ולא ניתן לבטל אותה.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex-row-reverse gap-2 sm:flex-row-reverse">
          <Button
            variant="destructive"
            className="rounded-full px-6"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            מחק נתונים
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
