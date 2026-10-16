/* Shared mutable state (ES module bindings can't be reassigned across files) */
export const ST = {
  tween:null, camTy:0, Wd:1, Hd:1, narrow:1,
  mouse:null, mouseDirty:false, cursorPt:null, hoverZone:null, cursorZone:null, drag:null,
  curItem:null, activeZone:null, tour:null, last:0, time:0
};
