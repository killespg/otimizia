import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Verde Fechamento — cor da marca (crescimento, dinheiro, negócio ganho).
        brand: {
          50: "#f5f0ff",
          100: "#eadcff",
          200: "#d8bdff",
          300: "#be92ff",
          400: "#a363ff",
          500: "#8b3dff",
          600: "#7424e8",
          700: "#5f18c4",
          800: "#4b1598",
          900: "#341064",
          950: "#1d073d",
        },
        // Tinta quase-preta levemente esverdeada + cinzas com a mesma temperatura.
        ink: {
          DEFAULT: "#170f24",
          soft: "#3d334d",
          muted: "#645875",
        },
        // Base off-white com leve viés verde (não creme) + superfícies sólidas.
        canvas: "#f8f6ff",
        surface: "#ffffff",
        "surface-2": "#f0ebfb",
        // Fios estruturais (a estrutura vem das linhas, não de sombras).
        line: {
          DEFAULT: "#ded5ef",
          strong: "#bfaee0",
        },
        // Accent quente, usado com parcimônia (calor humano).
        honey: "#f59e0b",
        // Vermelho calibrado para atraso/perdido — claro, nunca alarmante.
        danger: {
          50: "#fef3f2",
          100: "#fee4e2",
          200: "#fecdca",
          500: "#f04438",
          600: "#d92d20",
          700: "#b42318",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderColor: {
        DEFAULT: "#ded5ef",
      },
      // Cantos quase retos — o oposto do "tudo arredondado".
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "4px",
        lg: "5px",
        xl: "6px",
        "2xl": "8px",
        "3xl": "10px",
        "4xl": "12px",
      },
      // Sem sombras flutuantes. Foco discreto + regra fina, só.
      boxShadow: {
        card: "none",
        "card-hover": "none",
        hero: "none",
        focus: "0 0 0 3px rgba(139,61,255,0.24)",
      },
      // Curvas fortes — as padrão do Tailwind/CSS são fracas demais (Emil Kowalski).
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.23, 1, 0.32, 1)",
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
