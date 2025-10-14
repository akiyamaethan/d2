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
  </center>
`;

const clearButton = document.getElementById("clearBtn") as HTMLButtonElement;
const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const cursor = { active: false, x: 0, y: 0 };

canvas.addEventListener("mousedown", (mousePosition) => {
  cursor.active = true;
  cursor.x = mousePosition.offsetX;
  cursor.y = mousePosition.offsetY;
});

canvas.addEventListener("mousemove", (mousePosition) => {
  if (cursor.active) {
    ctx?.beginPath();
    ctx?.moveTo(cursor.x, cursor.y);
    ctx?.lineTo(mousePosition.offsetX, mousePosition.offsetY);
    ctx?.stroke();
    cursor.x = mousePosition.offsetX;
    cursor.y = mousePosition.offsetY;
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
});

clearButton.addEventListener("click", () => {
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
});
