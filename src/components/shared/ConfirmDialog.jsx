import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

// ============================================
// DIALOG STYLE CONFIGURATION
// ============================================
const DIALOG_STYLES = {
  confirm: {
    icon: Info,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
    buttonColor: "bg-blue-600 hover:bg-blue-700"
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    buttonColor: "bg-yellow-600 hover:bg-yellow-700"
  },
  delete: {
    icon: AlertCircle,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    buttonColor: "bg-red-600 hover:bg-red-700"
  },
  alert: {
    icon: CheckCircle2,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    buttonColor: "bg-green-600 hover:bg-green-700"
  }
};

// ============================================
// CONFIRM DIALOG COMPONENT
// ============================================
export default function ConfirmDialog({
  open,
  onOpenChange,
  type = "confirm",
  title,
  message,
  confirmText = "OK",
  cancelText = "Abbrechen",
  onConfirm
}) {
  const style = DIALOG_STYLES[type] || DIALOG_STYLES.confirm;
  const Icon = style.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onOpenChange(false);
  };

  const showCancelButton = type !== "alert" && onConfirm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full ${style.bgColor} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${style.iconColor}`} />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700 pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showCancelButton && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl w-full sm:w-auto"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            className={`text-white rounded-xl w-full sm:w-auto ${style.buttonColor}`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}