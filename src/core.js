const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = id => document.getElementById(id);

export {reduce, $};
