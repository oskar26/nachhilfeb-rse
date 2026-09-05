import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { triggerHaptic } from "../../lib/haptics"

const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

const Tabs = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }
>(({ className, defaultValue, value: controlledValue, onValueChange, children, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(defaultValue || "")
    const isControlled = controlledValue !== undefined
    const activeValue = isControlled ? controlledValue! : localValue

    const handleValueChange = (newValue: string) => {
        if (newValue !== activeValue) {
            triggerHaptic('selection');
        }
        if (!isControlled) {
            setLocalValue(newValue)
        }
        if (onValueChange) onValueChange(newValue)
    }

    return (
        <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
            <div ref={ref} className={cn("w-full", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-11 items-center justify-center rounded-2xl bg-gray-100/90 p-1 text-gray-500 dark:bg-gray-800/80 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, onClick, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value

    return (
        <button
            ref={ref}
            type="button"
            className={cn(
                "relative inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer z-10",
                isActive
                    ? "text-gray-950 dark:text-white font-bold"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                className
            )}
            onClick={(e) => {
                if (context) context.onValueChange(value)
                if (onClick) onClick(e)
            }}
            {...props}
        >
            {isActive && (
                <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white shadow-sm rounded-xl dark:bg-gray-900 border border-black/5 dark:border-white/10 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
            )}
            {children}
        </button>
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (context?.value !== value) return null

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
                "mt-3 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                className
            )}
            {...(props as any)}
        >
            {children}
        </motion.div>
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
