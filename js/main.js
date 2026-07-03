// ==================== Main Entry ====================

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
  // Initialize universal card inputs first (if default value > 0)
  updateUniversalCardInputs();
  // Then initialize card preview
  updateCardPreview();
});
