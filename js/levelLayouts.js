export const LEVEL_LAYOUTS = [
  // Level 1
  { cols: 2, rows: 1, slots: [ {x:0, y:0}, {x:1, y:0} ] },
  // Level 2 - L shape
  { cols: 2, rows: 2, slots: [ {x:0, y:0}, {x:1, y:0}, {x:0, y:1} ] },
  // Level 3 - 2x2 square plus one on right
  { cols: 3, rows: 2, slots: [ {x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:0} ] },
  // Level 4 - 3x2 rectangle
  { cols: 3, rows: 2, slots: [ {x:0,y:0}, {x:1,y:0}, {x:2,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1} ] },
  // Level 5 - simple 3x3 grid
  { cols: 3, rows: 3, slots: [
      {x:0,y:0}, {x:1,y:0}, {x:2,y:0},
      {x:0,y:1}, {x:1,y:1}, {x:2,y:1},
      {x:0,y:2}, {x:1,y:2}, {x:2,y:2}
    ] }
];
