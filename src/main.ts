// deno-lint-ignore-file
import "./style.css";

document.body.innerHTML = `
  <center>
    <h1>Ethan's Artistic Space</h1>
    <canvas id="myCanvas" width="256" height="256"></canvas>
    <br/>
    <button id="clearBtn">Clear</button>
    <button id="undoBtn">Undo</button>
    <button id="redoBtn">Redo</button>
    <button id="exportBtn">Export PNG</button>
    <br/>
    <section>
      <h4> Tools: </h4>
      <button id="pencilBtn">Pencil</button>
      <button id="markerBtnThin">Marker</button>
      <button id="markerBtnThick">Thick Marker</button>
    </section>
    <section id="stickerBtns">
      <h4> Stickers: </h4>
      <button class="stickerBtn">😀</button>
      <button class="stickerBtn">🌸</button>
      <button class="stickerBtn">🔥</button>
      <button class="stickerBtn">Custom</button>
    </section>
  </center>
`;

type Tool = {
  name: string;
  thickness: number;
};

const exportButton = document.getElementById("exportBtn") as HTMLButtonElement;
const stickerSection = document.getElementById("stickerBtns") as HTMLElement;
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
const ctx = canvas.getContext("2d")!;

const bus = new EventTarget();

let currentTool: Tool = { name: "Pencil", thickness: 2 };
let currentSticker: string | null = null;
const commands: (LineCommand | StickerCommand)[] = [];
const redoCommands: (LineCommand | StickerCommand)[] = [];

let currentLineCommand: LineCommand | null = null;
let previewCommand: PreviewCommand | null = null;
let draggedSticker: StickerCommand | null = null;

function notify(event: string) {
  bus.dispatchEvent(new Event(event));
}

// ---------------------- COMMANDS ----------------------

class LineCommand {
  points: { x: number; y: number }[] = [];
  thickness: number;
  constructor(x: number, y: number, thickness: number = 2) {
    this.points.push({ x, y });
    this.thickness = thickness;
  }
  execute(ctxArg?: CanvasRenderingContext2D) {
    const drawCtx = ctxArg ?? ctx;
    drawCtx.lineWidth = this.thickness;
    drawCtx.beginPath();
    const { x, y } = this.points[0]!;
    drawCtx.moveTo(x, y);
    for (const { x, y } of this.points) drawCtx.lineTo(x, y);
    drawCtx.stroke();
  }
  grow(x: number, y: number) {
    this.points.push({ x, y });
  }
}

class PreviewCommand {
  x: number;
  y: number;
  tool: Tool;
  sticker: string | null;

  constructor(tool: Tool, x: number, y: number, sticker: string | null) {
    this.x = x;
    this.y = y;
    this.tool = tool;
    this.sticker = sticker;
  }

  execute(ctxArg?: CanvasRenderingContext2D) {
    const drawCtx = ctxArg ?? ctx;
    drawCtx.globalAlpha = 0.5;

    if (this.tool.name === "Sticker" && this.sticker) {
      // Emoji sticker preview
      drawCtx.font = "32px serif";
      drawCtx.fillText(this.sticker, this.x - 16, this.y + 16);
    } else {
      // Drawing tool preview as circle
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, this.tool.thickness / 2, 0, Math.PI * 2);
      drawCtx.fillStyle = "black";
      drawCtx.fill();
    }

    drawCtx.globalAlpha = 1.0;
  }
}

class StickerCommand {
  emoji: string;
  x: number;
  y: number;

  constructor(emoji: string, x: number, y: number) {
    this.emoji = emoji;
    this.x = x;
    this.y = y;
  }

  execute(ctxArg?: CanvasRenderingContext2D) {
    const drawCtx = ctxArg ?? ctx;
    drawCtx.font = "32px serif";
    drawCtx.fillText(this.emoji, this.x - 16, this.y + 16);
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  contains(x: number, y: number): boolean {
    const size = 32;
    return x > this.x - size / 2 && x < this.x + size / 2 &&
      y > this.y - size / 2 && y < this.y + size / 2;
  }
}

// ---------------------- EVENT HANDLERS ----------------------

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("tool-moved", redraw);

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool.name === "Sticker" && currentSticker) {
    const stickerCmd = new StickerCommand(currentSticker, x, y);
    commands.push(stickerCmd);
    redoCommands.length = 0;
    notify("drawing-changed");
    return;
  }

  // Default: start drawing a line
  currentLineCommand = new LineCommand(x, y, currentTool.thickness);
  commands.push(currentLineCommand);
  redoCommands.length = 0;
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (draggedSticker) {
    draggedSticker.drag(x, y);
    notify("drawing-changed");
    return;
  }

  // Always show preview for current tool
  previewCommand = new PreviewCommand(currentTool, x, y, currentSticker);
  notify("tool-moved");

  // If drawing with mouse down
  if (currentLineCommand && currentTool.name !== "Sticker") {
    currentLineCommand.grow(x, y);
    notify("drawing-changed");
  }
});

canvas.addEventListener("mouseup", () => {
  currentLineCommand = null;
  draggedSticker = null;
  notify("drawing-changed");
});

canvas.addEventListener("mouseout", () => {
  previewCommand = null;
  notify("tool-moved");
});

// ---------------------- TOOL BUTTONS ----------------------

pencilButton.addEventListener("click", () => {
  currentTool = { name: "Pencil", thickness: 2 };
  currentSticker = null;
  notify("tool-moved");
});

markerButtonThin.addEventListener("click", () => {
  currentTool = { name: "Marker", thickness: 5 };
  currentSticker = null;
  notify("tool-moved");
});

markerButtonThick.addEventListener("click", () => {
  currentTool = { name: "Thick Marker", thickness: 10 };
  currentSticker = null;
  notify("tool-moved");
});

document.querySelectorAll(".stickerBtn").forEach((btn) => {
  currentSticker = (btn as HTMLButtonElement).textContent;
  setupButton(btn as HTMLButtonElement, currentSticker);
});

function setupButton(btn: HTMLButtonElement, sticker: string) {
  btn.addEventListener("click", () => {
    currentTool = { name: "Sticker", thickness: 0 };
    if (sticker == "Custom") {
      currentSticker = prompt("Custom sticker text", "🧽");
      let button = document.createElement("button");
      button.className = "stickerBtn";
      button.textContent = currentSticker!;
      stickerSection.append(button);
      setupButton(button, currentSticker!);
    } else {
      currentSticker = sticker;
    }
    notify("tool-moved");
  });
}
// ---------------------- CLEAR / UNDO / REDO ----------------------

clearButton.addEventListener("click", () => {
  commands.length = 0;
  redoCommands.length = 0;
  notify("drawing-changed");
});

undoButton.addEventListener("click", () => {
  if (commands.length > 0) {
    redoCommands.push(commands.pop()!);
    notify("drawing-changed");
  }
});

redoButton.addEventListener("click", () => {
  if (redoCommands.length > 0) {
    commands.push(redoCommands.pop()!);
    notify("drawing-changed");
  }
});

// ---------------------- RENDER LOOP ----------------------

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of commands) cmd.execute();
  if (previewCommand) previewCommand.execute();
}

requestAnimationFrame(function loop() {
  redraw();
  requestAnimationFrame(loop);
});

// ---------------------- EXPORT ----------------------

exportButton.addEventListener("click", () => {
  const EXPORT_SIZE = 1024;
  const tmp = document.createElement("canvas");
  tmp.width = EXPORT_SIZE;
  tmp.height = EXPORT_SIZE;
  const tmpCtx = tmp.getContext("2d")!;
  const scaleX = tmp.width / canvas.width;
  const scaleY = tmp.height / canvas.height;

  tmpCtx.save();
  tmpCtx.scale(scaleX, scaleY);

  for (const cmd of commands) {
    (cmd as any).execute(tmpCtx);
  }

  tmpCtx.restore();

  const dataUrl = tmp.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "drawing.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});