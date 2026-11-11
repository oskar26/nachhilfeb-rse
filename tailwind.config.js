/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                gray: {
                    50: '#faf7ef',
                    100: '#f3eee3',
                    200: '#e5ded0',
                    300: '#d3c9b8',
                    400: '#a89e8e',
                    500: '#7b7265',
                    600: '#5c554b',
                    700: '#403b33',
                    800: '#2a2722',
                    900: '#1c1917',
                    950: '#12100e',
                },
                warning: {
                    DEFAULT: '#F59E0B',
                },
                primary: {
                    DEFAULT: '#FACC15',
                    hover: '#EAB308',
                    foreground: '#1C1917',
                },
                secondary: {
                    DEFAULT: '#F1ECE1',
                    foreground: '#1C1917',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Anton', 'Arial Narrow', 'Impact', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
            },
        },
    },
    plugins: [],
}
