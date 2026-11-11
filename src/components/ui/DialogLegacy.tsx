import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"
import { triggerHaptic } from "../../lib/haptics"

export interface DialogProps {
    children: React.ReactNode;
    open?: boolean;
    onClose?: () => void;
    onOpenChange?: (open: boolean) => void;
    /** Optionale Klassen für den Panel-Container (z. B. größere max-width für Lightboxen). */
    panelClassName?: string;
    /** Barrierefreier Name für role="dialog". */
    ariaLabel?: string;
}

const Dialog = ({ children, open, onClose, onOpenChange, panelClassName, ariaLabel }: DialogProps) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleClose = React.useCallback(() => {
        if (onClose) onClose();
        if (onOpenChange) onOpenChange(false);
    }, [onClose, onOpenChange]);

    React.useEffect(() => {
        if (!open) return;
        triggerHaptic('medium');
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, handleClose]);

    if (!mounted || typeof document === 'undefined') return null;

    // Als Portal in document.body rendern: So bleibt das Overlay (fixed inset-0)
    // immer am Viewport ausgerichtet – auch wenn ein Elternelement transformiert
    // ist (transform/filter/backdrop-blur brechen sonst die fixed-Positionierung
    // und lassen unten eine weiße Fläche frei).
    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    {/* Dialog Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={{ type: "spring", stiffness: 350, damping: 26 }}
                        className={cn("relative z-10 w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto", panelClassName)}
                        role="dialog"
                        aria-modal="true"
                        aria-label={ariaLabel}
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative w-full overflow-hidden rounded-3xl border border-gray-100/80 bg-white p-6 shadow-2xl dark:bg-gray-900 dark:border-gray-800/80 dark:text-gray-100",
            className
        )}
        {...props}
    >
        {children}
    </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-1", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
