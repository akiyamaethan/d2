// deno-lint-ignore-file
import "./style.css";

document.body.innerHTML = `
  <center>
    <h1>Ethan's Artistic Space</h1>
    <canvas 
      id="myCanvas"
      width="256"
      height="256"
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
    <br/>
    <section>
      <h4> Tools: </h4>
      <br/>
      <button
        id="pencilBtn"
      >Pencil</button>
      <button
        id="markerBtnThin"
      >Marker</button>
      <button
        id="markerBtnThick"
      >Thick Marker</button>
    </section>
  </center>
`;

const clearButton = document.getElementById("clearBtn") as HTMLButtonElement;
const undoButton = document.getElementById("undoBtn") as HTMLButtonElement;
const redoButton = document.getElementById("redoBtn") as HTMLButtonElement;
const pencilButton = document.getElementById("pencilBtn") as HTMLButtonElement;
const markerButtonThin = document.getElementById(
  "markerBtnThin",
) as HTMLButtonElement;
const markerButtonThick = document.getElementById(
  "markerBtnThick",
) as HTMLButtonElement;
const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const commands: LineCommand[] = [];
const redoCommands: LineCommand[] = [];
let cursorCommand: CursorCommand | null = null;
let currentLineCommand: LineCommand | null = null;
const bus = new EventTarget();

function notify(event: string) {
  bus.dispatchEvent(new Event(event));
}

type Tool = {
  thickness: number;
};

const currentTool: Tool = { thickness: 2 };

class LineCommand {
  points: { x: number; y: number }[];

  constructor(x: number, y: number) {
    this.points = [{ x, y }];
  }
  execute() {
    ctx!.lineWidth = currentTool.thickness;
    ctx!.beginPath();
    const { x, y } = this.points[0]!;
    ctx!.moveTo(x, y);
    for (const { x, y } of this.points) {
      ctx!.lineTo(x, y);
    }
    ctx!.stroke();
  }
  grow(x: number, y: number) {
    this.points.push({ x, y });
  }
}

/*
class MarkerCommand {
  points: { x: number; y: number }[];
  markerSize: number;
  constructor(x: number, y: number, markerSize: number = 5) {
    this.points = [{ x, y }];
    this.markerSize = markerSize;
  }
  execute() {
    ctx!.beginPath();
    const { x, y } = this.points[0]!;
    ctx!.moveTo(x, y);
    for (const { x, y } of this.points) {
      ctx!.lineTo(x, y);
    }
    ctx!.stroke();
  }
  grow(x: number, y: number) {
    this.points.push({ x, y });
  }
}
*/
class CursorCommand {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  execute() {
    ctx!.font = "32px monospace";
    ctx!.fillText("*", this.x, this.y);
  }
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);

function tick() {
  redraw();
  requestAnimationFrame(tick);
}
tick();

canvas.addEventListener("mousedown", (mousePosition) => {
  const rect = canvas.getBoundingClientRect();
  const x = mousePosition.clientX - rect.left;
  const y = mousePosition.clientY - rect.top;
  currentLineCommand = new LineCommand(x, y);
  commands.push(currentLineCommand);
  redoCommands.length = 0;
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (mousePosition) => {
  const rect = canvas.getBoundingClientRect();
  const realX = mousePosition.clientX - rect.left;
  const realY = mousePosition.clientY - rect.top;
  cursorCommand = new CursorCommand(realX, realY);
  notify("cursor-changed");

  if (mousePosition.buttons == 1) {
    currentLineCommand!.points.push({ x: realX, y: realY });
    notify("drawing-changed");
  }
});

canvas.addEventListener("mouseout", () => {
  cursorCommand = null;
  notify("cursor-changed");
});

canvas.addEventListener("mouseenter", (mousePosition) => {
  const rect = canvas.getBoundingClientRect();
  const x = mousePosition.clientX - rect.left;
  const y = mousePosition.clientY - rect.top;
  cursorCommand = new CursorCommand(x, y);
  notify("cursor-changed");
});

canvas.addEventListener("mouseup", () => {
  currentLineCommand = null;
  notify("drawing-changed");
});

clearButton.addEventListener("click", () => {
  commands.length = 0;
  notify("drawing-changed");
});

undoButton.addEventListener("click", () => {
  if (commands.length > 0) {
    const popped = commands.pop();
    if (popped) {
      redoCommands.push(popped);
    }
    notify("drawing-changed");
  }
});

redoButton.addEventListener("click", () => {
  if (redoCommands.length > 0) {
    const popped = redoCommands.pop();
    if (popped) {
      commands.push(popped);
    }
    notify("drawing-changed");
  }
});

pencilButton.addEventListener("click", () => {
  currentTool.thickness = 2;
});

markerButtonThin.addEventListener("click", () => {
  currentTool.thickness = 5;
});

markerButtonThick.addEventListener("click", () => {
  currentTool.thickness = 10;
});

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  commands.forEach((cmd) => cmd.execute());
  if (cursorCommand) {
    cursorCommand.execute();
  }
}
