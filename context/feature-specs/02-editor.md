We need the base chrome components that frame every editor screen: the top navbar and the left sidebar shell. These will be reused and extended in every chapter that follows. 

### Editor Navbar

Create: components/editor/editor-nafbar.tsx
The requirements are:
- Fix height Top Nafbar
- left, centre, and right sections
- Left section contains a sidebar toggle button
- Use PanelLeftOpen and PanelLeftCLose based on sidebar states
- Right section stays empty for now
- Dark background with subtle bottom border

### Project Sidebar

Create: `component/editor/product-projects-sidebar.tsx`
Requirements:
- Sidebars should float above the editor canvas.
- Opening it should not push the page content 
- slides in from the left.
- Accepts a `isOpen` prop 
- header with the Project title plus a close button.
- ShadCn `Tabs`
    -  my project 
    - shared.
- Both taps show an empty placeholder state.
- Full-width New Project button at the bottom with a Plus icon.

### Dialog Pattern

Use the existing coloured tokens from globals.css for dialogue styling
Support
- Title
- Description
- Footer actions
Do not build actual dialogues yet.

### Check When DOne

New components compiled without TypeScript errors. No lint errors. Dialogue pattern is ready for future use. 
