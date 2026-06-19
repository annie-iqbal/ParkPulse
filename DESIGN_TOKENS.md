# ParkWise AI - Design Tokens (Amber Theme)

## Overview
This document defines the design system for ParkWise AI using the Amber/Warm Brown color scheme for a modern, accessible parking management app.

## Color Palette

### Surface Colors
- **surface**: `#fff8f5` - Main background
- **surface-dim**: `#e0d8d5` - Dimmed surface
- **surface-bright**: `#fff8f5` - Bright surface
- **surface-container-lowest**: `#ffffff` - Lowest container
- **surface-container-low**: `#faf2ee` - Low container
- **surface-container**: `#f4ece8` - Default container
- **surface-container-high**: `#eee7e3` - High container
- **surface-container-highest**: `#e9e1dd` - Highest container
- **surface-variant**: `#e9e1dd` - Variant surface

### Text/On-Surface Colors
- **on-surface**: `#1e1b19` - Primary text
- **on-surface-variant**: `#554336` - Secondary text
- **inverse-surface**: `#33302d` - Inverse background
- **inverse-on-surface**: `#f7efeb` - Inverse text

### Outline Colors
- **outline**: `#887364` - Strong outline
- **outline-variant**: `#dbc2b0` - Subtle outline
- **surface-tint**: `#904d00` - Tint color

### Primary (Orange-Brown)
- **primary**: `#8d4b00` - Main brand color
- **on-primary**: `#ffffff` - Text on primary
- **primary-container**: `#b15f00` - Container variant
- **on-primary-container**: `#fffbff` - Text on container
- **inverse-primary**: `#ffb77d` - Inverse primary
- **primary-fixed**: `#ffdcc3` - Fixed variant
- **primary-fixed-dim**: `#ffb77d` - Dimmed fixed
- **on-primary-fixed**: `#2f1500` - Text on fixed
- **on-primary-fixed-variant**: `#6e3900` - Text variant

### Secondary (Dark Orange)
- **secondary**: `#895033` - Secondary color
- **on-secondary**: `#ffffff` - Text on secondary
- **secondary-container**: `#feb28f` - Container variant
- **on-secondary-container**: `#794227` - Text on container
- **secondary-fixed**: `#ffdbcc` - Fixed variant
- **secondary-fixed-dim**: `#ffb694` - Dimmed fixed
- **on-secondary-fixed**: `#351000` - Text on fixed
- **on-secondary-fixed-variant**: `#6d391e` - Text variant

### Tertiary (Golden)
- **tertiary**: `#6e5e0d` - Tertiary color
- **on-tertiary**: `#ffffff` - Text on tertiary
- **tertiary-container**: `#bfab56` - Container variant
- **on-tertiary-container**: `#4b3f00` - Text on container
- **tertiary-fixed**: `#f9e287` - Fixed variant
- **tertiary-fixed-dim**: `#dcc66e` - Dimmed fixed
- **on-tertiary-fixed**: `#221b00` - Text on fixed
- **on-tertiary-fixed-variant**: `#534600` - Text variant

### Error States
- **error**: `#ba1a1a` - Error color
- **on-error**: `#ffffff` - Text on error
- **error-container**: `#ffdad6` - Error container
- **on-error-container**: `#93000a` - Text on error container

### Semantic Colors
- **background**: `#fff8f5` - Page background
- **on-background**: `#1e1b19` - Page text

## Typography

### Headline Styles
- **headline-xl** (Desktop): 48px, weight 800, line-height 56px
- **headline-xl-mobile**: 32px, weight 800, line-height 40px
- **headline-lg**: 32px, weight 700, line-height 40px
- **headline-md**: 24px, weight 700, line-height 32px

### Body Styles
- **body-lg**: 18px, weight 400, line-height 28px
- **body-md**: 16px, weight 400, line-height 24px

### Label Styles
- **label-md**: 14px, weight 600, line-height 20px, letter-spacing 0.05em
- **label-sm**: 12px, weight 500, line-height 16px

## Spacing Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **margin-mobile**: 16px
- **margin-desktop**: 40px
- **gutter**: 16px

## Border Radius
- **sm**: 0.125rem (2px)
- **md**: 0.25rem (4px) - DEFAULT
- **lg**: 0.5rem (8px)
- **xl**: 0.75rem (12px)
- **full**: 9999px (circular)

## Typography Family
- **Font**: Inter (sans-serif)

## Component Guidelines

### Buttons
- Primary: Use `primary` background with `on-primary` text
- Secondary: Use `secondary` background with `on-secondary` text
- Tertiary: Use `tertiary` background with `on-tertiary` text
- Outlined: Use `outline` color for border, `on-surface` for text
- Text: Use `on-surface` color, no background

### Cards & Containers
- Default: Use `surface-container` background
- Elevated: Use `surface-container-high` background
- Sunken: Use `surface-container-low` background

### Status Indicators
- Success: Use `tertiary` color
- Warning: Use `primary` color
- Error: Use `error` color
- Info: Use `secondary` color

## Usage in Code
Apply colors using Tailwind class names:
```jsx
<div className="bg-primary text-on-primary">Primary Button</div>
<div className="bg-surface-container text-on-surface">Card</div>
<div className="border border-outline text-on-surface">Outlined Element</div>
```
