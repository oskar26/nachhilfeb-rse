import React from 'react';

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    className?: string;
}

export function Logo({ size = 32, className = '', ...props }: LogoProps) {
    return (
        <svg
            viewBox="53 92 248 248"
            width={size}
            height={size}
            fill="currentColor"
            preserveAspectRatio="xMidYMid meet"
            className={`shrink-0 ${className}`}
            {...props}
        >
            <g transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)" stroke="none">
                <path d="M930 2278 c0 -832 1 -853 53 -1003 66 -191 178 -345 342 -467 169 -127 351 -188 560 -188 438 0 821 303 937 740 22 84 22 94 25 888 l4 802 -961 0 -960 0 0 -772z m588 229 c206 -193 325 -302 701 -647 85 -78 121 -106 116 -89 -8 26 -161 502 -227 709 -22 69 -48 151 -58 183 l-18 57 234 0 234 0 0 -682 0 -682 -102 100 c-104 101 -592 554 -660 613 -30 26 -44 32 -75 29 -31 -2 -39 -7 -41 -25 -3 -19 -10 -23 -36 -23 -24 0 -38 -7 -54 -30 -12 -16 -22 -33 -22 -38 0 -5 45 -146 100 -313 55 -166 97 -305 94 -308 -3 -3 -98 -6 -212 -6 l-207 0 -3 683 c-1 375 1 682 4 682 3 0 108 -96 232 -213z" />
                <path d="M1364 2428 c13 -63 46 -293 46 -320 0 -20 5 -28 17 -28 9 0 25 -7 34 -16 17 -16 19 -15 29 10 5 15 10 32 10 38 0 7 14 8 36 5 33 -6 37 -4 47 24 12 31 21 32 73 12 14 -5 16 -2 12 20 -3 18 1 32 13 43 29 26 23 40 -22 58 -43 17 -97 51 -217 135 -40 28 -75 51 -78 51 -4 0 -4 -15 0 -32z" />
            </g>
        </svg>
    );
}

interface LogoBadgeProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'black' | 'yellow' | 'dark' | 'clean';
    className?: string;
}

export function LogoBadge({ size = 'md', variant = 'black', className = '' }: LogoBadgeProps) {
    const containerSizes = {
        sm: 'w-8 h-8 rounded-xl p-1.5',
        md: 'w-10 h-10 rounded-xl p-2',
        lg: 'w-14 h-14 rounded-2xl p-2.5',
        xl: 'w-20 h-20 rounded-3xl p-3.5',
    }[size];

    const iconSizes = {
        sm: 20,
        md: 24,
        lg: 36,
        xl: 52,
    }[size];

    const variantStyles = {
        clean: '',
        black: 'bg-black text-white dark:bg-white dark:text-black shadow-md ring-1 ring-white/10',
        yellow: 'bg-primary text-black font-bold shadow-md shadow-primary/20 ring-1 ring-black/10',
        dark: 'bg-gray-900 text-white shadow-md dark:bg-gray-800 dark:text-white',
    }[variant];

    if (variant === 'clean') {
        return <Logo size={iconSizes} className={`text-black dark:text-white ${className}`} />;
    }

    return (
        <div className={`inline-flex items-center justify-center shrink-0 transition-all ${containerSizes} ${variantStyles} ${className}`}>
            <Logo size={iconSizes} />
        </div>
    );
}

export default Logo;
