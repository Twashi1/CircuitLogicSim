const BACKGROUND_COLOR = "#cccccc";
let circuits = [
    {
        "color": "#00ff00",
        "position": [0.1, 0.1]
    },
    {
        "color": "#0000ff",
        "position": [0.3, 0.1]
    }
];
let scale = 1.0;
let selected = -1;
let mouseX = 0;
let mouseY = 0;
const CIRCUIT_SIZE = 0.1;

// https://stackoverflow.com/questions/322378/javascript-check-if-mouse-button-down
let lmbDown = 0;

// Before any scale variables
// TODO: in future, base it off max(input count, output count)
function getCircuitHeight(circuit) {
    return CIRCUIT_SIZE;
}

function aabbIntersect(left1, right1, bot1, top1, left2, right2, bot2, top2) {
    return !((right1[0] < left2[0] || left1[0] > right2[0]) && (top1[1] < bot2[1] || bot1[1] > top2[1]));
}

function aabbContains(left1, right1, bot1, top1, px, py) {
    return px > left1 && px < right1 && py > bot1 && py < top1;
}

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    
    function clearScreen() {
        const { width, height } = canvas.getBoundingClientRect(); 

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);
    }

    canvas.addEventListener("mousedown", (event) => {
        let rect = event.target.getBoundingClientRect();
        let cursorX = (event.clientX - rect.left) / rect.width;
        let cursorY = (event.clientY - rect.top) / rect.height;
    
        findSelected(cursorX, cursorY);
    });

    // https://stackoverflow.com/questions/322378/javascript-check-if-mouse-button-down
    canvas.addEventListener("mousedown", (event) => { if (event.button == 0) ++lmbDown; });
    canvas.addEventListener("mouseup", (event) => {if (event.button == 0) --lmbDown; });

    // TODO: how does this work on mobile?
    canvas.addEventListener("mousemove", (event) => {
        let rect = event.target.getBoundingClientRect();
        mouseX = (event.clientX - rect.left) / rect.width;
        mouseY = (event.clientY - rect.top) / rect.height;
    });

    function findSelected(cursorX, cursorY) {
        selected = -1;
        
        // Iterate circuits
        for (let i = 0; i < circuits.length; i++) {
            let currentCircuit = circuits[i];
            
            // Find circuit that was clicked on (if there was one)
            if (aabbContains(
                currentCircuit.position[0],
                currentCircuit.position[0] + CIRCUIT_SIZE,
                currentCircuit.position[1],
                currentCircuit.position[1] + getCircuitHeight(currentCircuit),
                cursorX,
                cursorY
            )) {
                selected = i;
                console.log("Selected circuit!");
            }
        }
    }

    /*
    Expecting following fields for each circuit:
    logicalRepresentation : CIRCUIT_REPRESENTATION,
    name : str,
    inputLabels : str,
    outputLabels : str,
    color : str,
    position : [num, num], Position given in percentage of screen
    links: [
        {"circuit": circuitIndex},
        {"input": inputIndex},
        {"output": outputIndex}
    ]
    */

    function drawCircuit(scale, circuit, canvasWidth, canvasHeight) {
        // Calculate draw coordinates
        let x = circuit.position[0] * scale * canvasWidth;
        let y = circuit.position[1] * scale * canvasHeight;
        let width = scale * CIRCUIT_SIZE * canvasWidth;
        let height = scale * CIRCUIT_SIZE * canvasHeight;

        ctx.fillStyle = circuit.color;
        ctx.fillRect(x, y, width, height);
    }

    function drawCircuits(scale, circuits) {
        const {width, height} = canvas.getBoundingClientRect();

        for (let i = 0; i < circuits.length; i++) {
            drawCircuit(scale, circuits[i], width, height)
        }
    }

    function updateCircuitPosition() {
        if (selected != -1 && lmbDown) {
            circuits[selected].position = [mouseX - CIRCUIT_SIZE / 2, mouseY - getCircuitHeight(circuits[selected]) / 2];
        }
    }

    function update() {
        updateCircuitPosition();
        draw();
    }

    function draw() {
        clearScreen();
        drawCircuits(scale, circuits)
    }

    // 60 fps
    window.setInterval(update, 17);
});