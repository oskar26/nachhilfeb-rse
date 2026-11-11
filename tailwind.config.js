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
                    bgDark: '#422006',
                    textDark: '#FDBA74',
                },
                primary: {
                    DEFAULT: '#FACC15',
                    hover: '#EAB308',
                    foreground: '#1C1917',
                },
                brand: {
                    DEFAULT: '#FACC15',
                    ink: '#7C5A00',
                },
                secondary: {
                    DEFAULT: '#F1ECE1',
                    foreground: '#1C1917',
                },
                subject: {
                    deutsch: '#1E90FF',
                    englisch: '#003366',
                    franzoesisch: {
                        DEFAULT: '#0055A4', // Tricolore main
                        secondary: '#EF4135',
                        white: '#FFFFFF',
                    },
                    kunst: '#FF6EC7', // Gradient start
                    kunst_end: '#FFD166', // Gradient end
                    griechisch: '#0D5EAF',
                    latein: '#C19A6B',
                    musik: '#7B3FBF',
                    literatur: '#8B0000',
                    kultur: '#2E8B57',
                    geschichte: '#8B4513',
                    paedagogik: '#FF8C00',
                    erdkunde: '#2B7A78',
                    philosophie: '#4B0082',
                    sowi: '#708090', // Sozialwissenschaften
                    wirtschaft_gesell: '#1F4E79',
                    wirtschaft_politik: '#005A9C',
                    biologie: '#2E8B57',
                    chemie: '#00A5CF',
                    informatik: '#00AEEF',
                    mathematik: '#D62728',
                    physik: '#0F52BA',
                    blauer_planet: '#0077BE', // Gradient start
                    blauer_planet_end: '#00A0B0', // Gradient end
                    prakt_philosophie: '#B497BD',
                    religion: '#FFD700',
                    sport: '#32CD32',
                }
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
