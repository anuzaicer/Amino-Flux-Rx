# Reorganize the Amino Flux header

## Scope
- Keep the current larger sticky header, white treatment-context styling, and existing mobile overflow safeguards.
- Replace the product-heavy desktop navigation with: Home, About, Treatments, Lab Testing, How It Works, and a primary Consultations action.
- Keep gender, search, account, and cart controls together as utilities on the right.

## Navigation behavior
- Create `/about` because no About route currently exists, using only established Amino Flux care, provider-review, lab, pharmacy, and privacy language already present in the site.
- Make Treatments a gender-aware dropdown containing the existing category set; erectile dysfunction remains visible only in the men's context.
- Add route-aware active styling using the current men's blue or women's green accent.
- Mirror the same structure in the mobile menu, with an expandable Treatments group and a full-width Consultations action.
- Close desktop and mobile treatment menus after navigation and keep backdrop dismissal for the desktop dropdown.

## Responsive layout
- Show the organized desktop navigation at 1280px and above with compact text tabs and controlled spacing.
- Keep the existing utility controls and hamburger layout below that breakpoint to preserve 320px support.
- Preserve sticky positioning, menu height limits, safe-area spacing, and hash-navigation offset behavior.

## Validation
- Check home, About, category, lab testing, How It Works, and product pages at 320, 390, 430, 768, 1280, and 1440 pixels.
- Verify sticky behavior, active states, desktop dropdown, mobile expandable Treatments group, destination closing, and no horizontal overflow.
- Run TypeScript checking, targeted linting, and formatting checks.

## Files
- Update `src/components/home/SiteHeader.tsx`.
- Add `src/routes/about.tsx`.
- Only adjust shared styles if validation reveals a navigation-specific layout issue.
