import "./style.css";

document.body.innerHTML = `
  <center>
    <h1>Ethan's Artistic Space</h1>
    <canvas 
      id="myCanvas"
    ></canvas>
    <br/>
    <button
      id="clearBtn"
    >Clear</button>
    <button
      id="undoBtn"
    >Undo</button>
    <button
      id="redoBtn"
    >Redo</button>
  </center>
`;

const clearButton = document.getElementById("clearBtn") as HTMLButtonElement;
const undoButton = document.getElementById("undoBtn") as HTMLButtonElement;
//const redoButton = document.getElementById("redoBtn") as HTMLButtonElement;
const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const lines: Array<Array<{ x: number; y: number }>> = [];
let currentLine: Array<{ x: number; y: number }> | null = null;
const cursor = { active: false, x: 0, y: 0 };

const DRAWING_CHANGED = "drawing-changed";

function notifyCanvasChanged(detail: Record<string, unknown> = {}) {
  const drawing_changed = new CustomEvent(DRAWING_CHANGED, {
    detail,
    bubbles: true,
  });
  canvas.dispatchEvent(drawing_changed);
}

canvas.addEventListener("mousedown", (mousePosition) => {
  cursor.active = true;
  cursor.x = mousePosition.offsetX;
  cursor.y = mousePosition.offsetY;

  currentLine = [];
  lines.push(currentLine);
  currentLine!.push({ x: cursor.x, y: cursor.y });

  redraw();
});

canvas.addEventListener("mousemove", (mousePosition) => {
  if (cursor.active) {
    cursor.x = mousePosition.offsetX;
    cursor.y = mousePosition.offsetY;
    currentLine!.push({ x: cursor.x, y: cursor.y });

    redraw();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentLine = null;

  redraw();
});

clearButton.addEventListener("click", () => {
  lines.length = 0;
  redraw();
  notifyCanvasChanged({ type: "clear", lines: 0 });
});

undoButton.addEventListener("click", () => {
  if (lines.length > 0) {
    lines.pop();
    redraw();
    notifyCanvasChanged({ type: "undo", lines: lines.length });
  }
});

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of lines) {
    if (line.length > 1) {
      ctx.beginPath();
      const first = line[0]!;
      const { x, y } = first;
      ctx.moveTo(x, y);
      for (const { x, y } of line) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  notifyCanvasChanged({ type: "redraw", lines: lines.length });
}
