// Temporary debug utility - you can delete this file after fixing the sidebar
// Run this in the browser console to reset the sidebar state

// Reset sidebar to open
localStorage.setItem('sidebarOpen', 'true');
console.log('✅ Sidebar state reset to OPEN');
console.log('Please refresh the page to see the sidebar');

// Or to check current state:
console.log('Current sidebar state:', localStorage.getItem('sidebarOpen'));
