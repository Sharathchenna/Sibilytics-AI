# UI/UX Quick Fixes Guide

**Quick Reference:** Copy-paste solutions for common UI/UX issues

---

## 🔴 Critical Fixes - Do These First

### 1. Add Form Labels (Contact Page)

**File:** `frontend/app/contact/page.tsx`

**Replace this pattern:**
```tsx
<input
  type="text"
  name="name"
  placeholder="Your Name *"
/>
```

**With:**
```tsx
<div>
  <label 
    htmlFor="name" 
    className="block text-sm font-medium mb-2"
    style={{ color: '#3D342B' }}
  >
    Your Name <span className="text-red-500">*</span>
  </label>
  <input
    id="name"
    type="text"
    name="name"
    placeholder="Enter your full name"
  />
</div>
```

Apply to all 5 fields: name, email, phone, subject, message.

---

### 2. Add ARIA Labels to Icon Buttons

**File:** `frontend/app/components/Navbar.tsx` (line 237)

**Add:**
```tsx
<button
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
  aria-expanded={mobileMenuOpen}
  className="md:hidden p-2 rounded-full transition-colors"
>
  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
</button>
```

---

### 3. Fix Color Contrast

**File:** `frontend/app/components/Footer.tsx` (line 35)

**Change:**
```tsx
<p className="text-sm leading-relaxed font-jakarta" 
   style={{ color: '#D6CFC7', opacity: 0.8 }}>
```

**To:**
```tsx
<p className="text-sm leading-relaxed font-jakarta" 
   style={{ color: '#E8E1D9' }}>
```

---

### 4. Disable Form Fields During Submission

**File:** `frontend/app/contact/page.tsx`

**Add to all inputs:**
```tsx
disabled={isSubmitting}
className={`... ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
```

**Example:**
```tsx
<input
  type="text"
  name="name"
  disabled={isSubmitting}
  className={`w-full px-4 py-3 border rounded-lg ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
/>
```

---

### 5. Add Error Boundary

**Create:** `frontend/app/components/ErrorBoundary.tsx`

```tsx
'use client';
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: '#FDFCF8' }}
        >
          <div className="max-w-md w-full text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            
            <h1 
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}
            >
              Oops! Something went wrong
            </h1>
            
            <p 
              className="text-lg mb-8"
              style={{ color: '#786B61' }}
            >
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #BC6C4F, #A05A41)' }}
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Page
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  Error Details (Dev Mode)
                </summary>
                <pre className="mt-4 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Update:** `frontend/app/layout.tsx`

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ...`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

### 6. Add inputMode for Phone Field

**File:** `frontend/app/contact/page.tsx` (line 160)

**Add:**
```tsx
<input
  type="tel"
  name="phone"
  inputMode="tel" // ← Add this
  placeholder="Phone Number *"
/>
```

---

### 7. Add Keyboard Navigation to Dropdown

**File:** `frontend/app/components/Navbar.tsx`

**Add these handlers:**

```tsx
const handleDropdownKeyDown = (e: React.KeyboardEvent, item: NavItem) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setActiveDropdown(activeDropdown === item.label ? null : item.label);
  } else if (e.key === 'Escape') {
    setActiveDropdown(null);
  }
};

// Update button:
<button
  className="..."
  onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
  onKeyDown={(e) => handleDropdownKeyDown(e, item)}
  aria-haspopup="true"
  aria-expanded={activeDropdown === item.label}
  onMouseEnter={() => item.dropdown && handleMouseEnter(item.label)}
  onMouseLeave={handleMouseLeave}
>
  {item.label}
  <ChevronDown className="..." />
</button>
```

---

### 8. Fix Decorative Image Alt Text

**File:** `frontend/app/page.tsx` (line 44)

**Change:**
```tsx
<Image
  src="/logo-new.jpg"
  alt="Sybilytics Background" // ← Remove
  alt="" // ← Add empty string
  aria-hidden="true" // ← Add this
  width={800}
  height={800}
/>
```

---

## 🟠 High Priority Fixes

### 9. Increase Touch Target Sizes

**File:** `frontend/app/components/Navbar.tsx`

**Logo icon - Change from:**
```tsx
<div className="w-8 h-8 rounded-lg ...">
```

**To:**
```tsx
<div className="w-10 h-10 rounded-lg ..."> {/* 40px minimum */}
  <svg className="w-6 h-6" /> {/* 24px icon */}
</div>
```

**Footer icons - Add padding:**
```tsx
<a 
  href="mailto:sibilyticsai@gmail.com"
  className="p-2 inline-block" // ← Add padding wrapper
>
  <Mail className="w-5 h-5" />
</a>
```

---

### 10. Add Skip Navigation Link

**File:** `frontend/app/components/Navbar.tsx` (before nav element)

**Add:**
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:rounded-lg focus:text-white focus:font-semibold focus:shadow-lg"
  style={{ background: '#BC6C4F' }}
>
  Skip to main content
</a>
```

**Update pages to add ID:**
```tsx
<div id="main-content">
  {/* Main page content */}
</div>
```

---

### 11. Improve Error Messages

**File:** `frontend/app/contact/page.tsx`

**Replace error display:**
```tsx
{formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
```

**With:**
```tsx
{formErrors.name && (
  <div 
    className="mt-2 flex items-start gap-2 text-red-700" 
    role="alert"
    aria-live="polite"
  >
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <p className="text-sm font-medium">{formErrors.name}</p>
  </div>
)}
```

**Import:**
```tsx
import { AlertCircle } from 'lucide-react';
```

---

### 12. Add Reduced Motion Support

**File:** `frontend/app/globals.css`

**Update existing media query (line 667):**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Disable specific decorative animations */
  .animate-blob,
  .animate-fade-in,
  .animate-slide-in-right,
  .animate-slide-in-left,
  .animate-scale-in {
    animation: none !important;
  }
  
  /* Keep essential animations (like loading spinners) */
  [class*="animate-spin"] {
    animation: spin 1s linear infinite !important;
  }
}
```

---

### 13. Add Focus Visible States

**File:** `frontend/app/components/ui/Button.tsx`

**Update baseStyles:**
```tsx
const baseStyles = `
  inline-flex items-center justify-center gap-2
  font-medium rounded-lg
  transition-all duration-200
  focus:outline-none 
  focus-visible:ring-2 
  focus-visible:ring-offset-2
  focus-visible:ring-blue-600
  disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
`;
```

---

### 14. Replace Inline Hover with CSS

**File:** `frontend/app/components/Navbar.tsx`

**Define in globals.css:**
```css
.nav-link {
  @apply px-4 py-2 rounded-full font-medium transition-all text-sm;
  color: #3D342B;
}

.nav-link:hover,
.nav-link:focus-visible {
  color: #BC6C4F;
  background: rgba(188, 108, 79, 0.08);
}
```

**Replace inline handlers with:**
```tsx
<Link href={item.href!} className="nav-link">
  {item.label}
</Link>
```

**Remove these:**
```tsx
onMouseEnter={(e) => { /* ... */ }}
onMouseLeave={(e) => { /* ... */ }}
```

---

## 🟡 Medium Priority Fixes

### 15. Optimize Blob Animation

**File:** `frontend/app/globals.css` (line 422)

**Change:**
```css
@keyframes blob {
  0%, 100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.05); /* Reduced from 1.1 */
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}

.animate-blob {
  animation: blob 5s infinite; /* Reduced from 7s */
  will-change: transform; /* Add for performance */
}
```

---

### 16. Add Font Display Swap

**File:** `frontend/app/layout.tsx`

**Update font definitions:**
```tsx
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: 'swap', // ← Add this
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap', // ← Add this
});
```

---

### 17. Add Blur Validation

**File:** `frontend/app/contact/page.tsx`

**Add handler:**
```tsx
const handleBlur = (fieldName: string) => {
  const value = formData[fieldName as keyof typeof formData];
  
  // Validate single field
  let error = '';
  
  switch (fieldName) {
    case 'email':
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Invalid email format';
      }
      break;
    case 'phone':
      if (value && !/^\+?[\d\s-()]+$/.test(value)) {
        error = 'Invalid phone format';
      }
      break;
    default:
      if (!value.trim()) {
        error = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
  }
  
  if (error) {
    setFormErrors({ ...formErrors, [fieldName]: error });
  } else {
    const { [fieldName]: _, ...rest } = formErrors;
    setFormErrors(rest);
  }
};
```

**Add to inputs:**
```tsx
<input
  onBlur={() => handleBlur('email')}
  // ... rest
/>
```

---

### 18. Add Image Quality Optimization

**File:** `frontend/app/page.tsx` (line 44)

**Update:**
```tsx
<Image
  src="/logo-new.jpg"
  alt=""
  aria-hidden="true"
  width={800}
  height={800}
  priority
  quality={60} // ← Add (default is 75)
  placeholder="blur" // ← Add if you have blur data URL
  className="w-[60%] max-w-4xl h-auto object-contain opacity-[0.05]"
/>
```

---

## 🧪 Testing Commands

### Accessibility Testing

```bash
# Install axe DevTools Chrome extension
# Then in Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to "axe DevTools" tab
# 3. Click "Scan ALL of my page"
```

### Color Contrast Testing

```bash
# Use WebAIM Contrast Checker
# https://webaim.org/resources/contrastchecker/

# Test these combinations:
# 1. Footer text: #D6CFC7 on #2C2420
# 2. Badge text: #786B61 on rgba(255,255,255,0.8)
# 3. Body text: #786B61 on #FFFFFF
```

### Keyboard Navigation Testing

**Manual test checklist:**
1. Tab through entire page - order should be logical
2. Press Tab to reach dropdowns - should open on Enter
3. Press Escape in dropdown - should close
4. Focus should be visible on all interactive elements
5. Skip link should appear on first Tab press

---

## 📋 Implementation Checklist

Copy this to track your progress:

### Critical Fixes
- [ ] Add form labels (Issue #1)
- [ ] Add ARIA labels to icon buttons (Issue #3)
- [ ] Fix color contrast (Issue #4)
- [ ] Disable form during submission (Issue #5)
- [ ] Add error boundary (Issue #6)
- [ ] Add inputMode="tel" (Issue #8)
- [ ] Keyboard navigation for dropdown (Issue #7)
- [ ] Fix decorative alt text (Issue #13)

### High Priority Fixes
- [ ] Increase touch target sizes (Issue #9)
- [ ] Add skip navigation link (Issue #17)
- [ ] Improve error messages (Issue #11)
- [ ] Add reduced motion support (Issue #14)
- [ ] Add focus visible states (Issue #10)
- [ ] Replace inline hover with CSS (Issue #16)

### Medium Priority Fixes
- [ ] Optimize blob animation (Issue #21)
- [ ] Add font display swap (Issue #22)
- [ ] Add blur validation (Issue #25)
- [ ] Optimize images (Issue #26)

---

## 🚀 Quick Test After Fixes

1. **Keyboard Test:** Tab through entire page, use Enter/Space/Escape
2. **Screen Reader Test:** Turn on VoiceOver (Cmd+F5 on Mac)
3. **Mobile Test:** Test on actual device or Chrome DevTools mobile emulation
4. **Color Test:** Run WebAIM contrast checker on main text colors
5. **Performance Test:** Run Lighthouse audit in Chrome DevTools

---

## 📚 Useful Resources

- **WCAG Quick Reference:** https://www.w3.org/WAI/WCAG21/quickref/
- **Keyboard Testing Guide:** https://webaim.org/articles/keyboard/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/

---

**Last Updated:** February 13, 2026  
**Related:** See `ui-ux-audit-report.md` for detailed explanations
