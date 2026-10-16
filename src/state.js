/* Shared mutable state (ES module bindings can't be reassigned across files) */
export const ST = {
  tween:null, camTy:0, Wd:1, Hd:1, narrow:1,
  mouse:null, mouseDirty:false, cursorPt:null, hoverRegion:null, cursorRegion:null, hoverB:null, drag:null,
  activeRegion:null, tour:null, last:0, time:0,
  // focus mode
  focusB:null,          // building currently focused (or null)
  focusAmt:0,           // 0 = explore pose, 1 = focus pose (eased by the loop)
  focusCur:null,        // smoothed focus target {x,y,z,dist}
  orbit:{az:0, el:0},   // user orbit offset in focus mode
  saved:null,           // explore camera saved on entering focus
  overscroll:0
};
