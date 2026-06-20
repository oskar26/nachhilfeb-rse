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
                    700: '#262626', // Input Field Background Dark
                    800: '#333333', // Borders & Dividers Dark
                    900: '#1E1E1E', // Surface Dark
                    950: '#121212', // Background Main Dark
                },
                warning: {
                    DEFAULT: '#F59E0B',
                    bgDark: '#422006',
                    textDark: '#FDBA74',
                },
                primary: {
                    DEFAULT: '#FACC15', // Accent Color (Buttons) updated to #FACC15
                    hover: '#EAB308',
                    foreground: '#000000',
                },
                secondary: {
                    DEFAULT: '#3B82F6', // Blue (Blue-500)
                    foreground: '#FFFFFF',
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
            },
        },
    },
    plugins: [],
}
