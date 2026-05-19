---
name: DeFi Minimalist
colors:
  surface: '#0f131e'
  surface-dim: '#0f131e'
  surface-bright: '#353945'
  surface-container-lowest: '#0a0e19'
  surface-container-low: '#171b27'
  surface-container: '#1b1f2b'
  surface-container-high: '#262a36'
  surface-container-highest: '#313441'
  on-surface: '#dfe2f2'
  on-surface-variant: '#e5bcc4'
  inverse-surface: '#dfe2f2'
  inverse-on-surface: '#2c303c'
  outline: '#ac878f'
  outline-variant: '#5c3f45'
  surface-tint: '#ffb1c3'
  primary: '#ffb1c3'
  on-primary: '#66002c'
  primary-container: '#ff4b89'
  on-primary-container: '#590026'
  inverse-primary: '#bb0058'
  secondary: '#ccbeff'
  on-secondary: '#350097'
  secondary-container: '#5200de'
  on-secondary-container: '#c2b1ff'
  tertiary: '#64df6e'
  on-tertiary: '#00390d'
  tertiary-container: '#22a63e'
  on-tertiary-container: '#00320a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd9e0'
  primary-fixed-dim: '#ffb1c3'
  on-primary-fixed: '#3f0019'
  on-primary-fixed-variant: '#8f0041'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#ccbeff'
  on-secondary-fixed: '#1f0060'
  on-secondary-fixed-variant: '#4d00d2'
  tertiary-fixed: '#80fc87'
  tertiary-fixed-dim: '#64df6e'
  on-tertiary-fixed: '#002105'
  on-tertiary-fixed-variant: '#005317'
  background: '#0f131e'
  on-background: '#dfe2f2'
  surface-variant: '#313441'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  mono-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: '0'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style

This design system is built on the principles of high-precision minimalism and modern financial transparency. It captures the essence of decentralized finance by removing unnecessary visual noise, allowing users to focus entirely on liquidity, price action, and execution. 

The aesthetic is characterized by **Minimalism** with subtle **Glassmorphism** influences. We prioritize generous white space (or "dark space"), crisp typography, and a "floating" interface feel. The emotional response should be one of sophisticated simplicity—making the complex world of crypto feel as intuitive as a high-end lifestyle app. The interface feels lightweight yet structurally sound, evoking trust through clarity rather than traditional corporate density.

## Colors

The color strategy centers on a high-energy primary pink (#FF007A) used sparingly for core actions and brand recognition. 

- **Primary Action**: Use the brand pink for "Swap," "Connect Wallet," and primary CTA buttons.
- **Contextual Actions**: We use a specialized "Buy" green and "Sell" red for the order book and trading modules to provide immediate semantic meaning.
- **Surface Strategy**: In dark mode, we use a deep navy-black (#0D111C) for the base background, with slightly lighter navy (#131A2A) for containers to create depth without relying on heavy borders.
- **Accents**: Subtle gradients between the primary pink and secondary purple can be used for active states or premium features.

## Typography

This design system utilizes **Inter** exclusively to maintain a utilitarian yet modern feel. The hierarchy is designed for rapid scanning of financial data.

- **Generous Tracking**: Use a slight positive letter-spacing for small labels (0.02em) to ensure legibility against dark backgrounds.
- **Numerical Data**: For price tickers and balances, ensure "tabular lining" figures are used so that numbers align vertically in tables and order books.
- **Weight Usage**: Reserve 600 weight for headlines and 500 for interactive labels. Body text should stay at 400 for maximum breathability.

## Layout & Spacing

The layout employs a **Fluid Grid** system designed to maximize the visibility of trading tools while maintaining a clean aesthetic.

- **Grid System**: A 12-column grid for desktop, 8-column for tablet, and 4-column for mobile.
- **Rhythm**: We use an 8px base unit. Most components use 20px (md) or 32px (lg) padding to maintain the "airy" feel characteristic of modern DeFi apps.
- **Alignment**: Center-aligned containers are used for simple swap interfaces, while dashboard views utilize full-width fluid layouts with 24px side margins.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Ambient Shadows**.

- **Surfaces**: Primary content lives on "Level 1" surfaces (the base background). Modal windows and dropdowns live on "Level 2" surfaces, which feature a subtle 1px border (#ffffff10 in dark mode) and a soft, wide-dispersion shadow.
- **Shadows**: Shadows are extremely subtle, using a deep navy tint rather than pure black (e.g., `0px 12px 32px rgba(0, 0, 0, 0.2)`).
- **Glassmorphism**: Use backdrop-blur (20px) on sticky navigation bars and overlay headers to maintain context of the content scrolling beneath them.

## Shapes

The shape language is defined by hyper-rounded corners, creating a friendly and "touchable" interface.

- **Standard Radius**: Core UI elements like input fields and small cards use a **16px to 20px** radius.
- **Large Radius**: Main containers (like the Swap card) and Modals use **24px to 32px** (Level 3 / Pill-shaped logic) to differentiate them from smaller interactive elements.
- **Interactive Elements**: Buttons should always appear as "Soft Pills," utilizing maximum roundedness to invite interaction.

## Components

### Buttons
- **Primary**: Brand Pink background, white text. High contrast, no border.
- **Buy/Sell**: High-saturation green or red. In the order book, these may be used as ghost buttons with colored text to avoid overwhelming the user.
- **Secondary**: Ghost style with a subtle border and translucent background hover states.

### Input Fields
Inputs are large (56px-64px height) with internal padding of 16px. They feature integrated "Max" buttons and token selectors. The background is slightly darker or lighter than the container to create a "recessed" feel.

### Cards
Cards are the primary container unit. They feature no shadows on the base grid but gain a soft shadow and a 1px border on hover or when elevated in a modal.

### Chips & Tags
Used for "Price Impact," "Network Status," or "Slippage." Use a low-opacity version of the status color (e.g., 10% Pink background with 100% Pink text).

### Lists & Order Books
Rows should have a hover state that highlights the entire line with a subtle background tint. Data columns must be right-aligned for numerical comparison, while asset names are left-aligned.