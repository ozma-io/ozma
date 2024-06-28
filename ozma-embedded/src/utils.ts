export const redirectClick = (e: MouseEvent, allowControlKeys?: boolean): boolean => {
  // Copied from router-link's guardEvent
  // don't redirect with control keys
  if (!allowControlKeys && (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)) {
    return false;
  }
  // don't redirect when preventDefault called
  if (e.defaultPrevented) {
    return false;
  }
  // don't redirect on right click
  if (e.button !== undefined && e.button !== 0) {
    return false;
  }
  return true;
};
