// TODO: deal with z levels of circuits
// TODO: draw links
// TODO: select links and connect circuits

const BACKGROUND_COLOR = "#cccccc";
const CIRCUIT_INACTIVE_LINK_COLOR = "#444444";
const CIRCUIT_ACTIVE_LINK_COLOR = "#888888";
const CIRCUIT_LINK_BORDER_COLOR = "#222222";
const CIRCUIT_LINK_WIRE_COLOR = "#999999";

/*
Expecting following fields for each circuit:
logicalRepresentation : CIRCUIT_REPRESENTATION,
name : str,
inputLabels : str,
outputLabels : str,
color : str,
// Position given in percentage of screen
position : [num, num],
// Links 
links: [
    {
        "circuit": circuitID,
        "input": inputIndex, // Index of an output within our circuit
        "output": outputIndex // Index of an input within their circuit
    }
]
*/

let circuits = {
    0: {
        "color": "#00ff00",
        "position": [0.1, 0.1],
        "inputLabels": ["a", "b"],
        "outputLabels": ["c"],
        "links": [
            {
                "circuit": 1,
                "input": 0,
                "output": 2
            }
        ]
    },
    1: {
        "color": "#0000ff",
        "position": [0.3, 0.1],
        "inputLabels": ["a", "b", "c"],
        "outputLabels": ["d"],
        "links": [
            {
                "circuit": 0,
                "input": 0,
                "output": 1
            }
        ]
    }
};
let scale = 1.0;

// Selected circuit
let selected = null;
// Selected link (negative value for output links)
let selectedLink = null;

let mouseX = 0;
let mouseY = 0;

let canvasWidth = 0;
let canvasHeight = 0;

const CIRCUIT_SIZE = 0.1;
const LINK_SIZE = 0.01;
const LINK_WIRE_WIDTH = 0.01;
const LINK_BORDER_WIDTH = 0.2;

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

function circleContains(x, y, r, px, py) {
    let dx = x - px;
    let dy = y - py;

    return dx * dx + dy * dy < r * r;
}

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    function drawLinkNode(x, y, scale, linked) {
        ctx.beginPath();
        ctx.arc(x * scale * canvasWidth, y * scale * canvasWidth, scale * LINK_SIZE * canvasWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = linked ? CIRCUIT_ACTIVE_LINK_COLOR : CIRCUIT_INACTIVE_LINK_COLOR;
        ctx.fill();
        ctx.lineWidth = scale * LINK_SIZE * LINK_BORDER_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_LINK_BORDER_COLOR;
        ctx.stroke();
    }

    function drawLinkWire(x0, y0, x1, y1, scale) {
        ctx.beginPath();
        ctx.moveTo(x0 * scale, y0 * scale);
        ctx.lineTo(x1 * scale, y1 * scale);
        ctx.lineWidth = scale * LINK_WIRE_WIDTH;
        ctx.strokeStyle = CIRCUIT_LINK_WIRE_COLOR;
        ctx.stroke();
    }
    
    function clearScreen() {
        const { width, height } = canvas.getBoundingClientRect(); 

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);
    }

    canvas.addEventListener("mousedown", (event) => {
        findSelected();
    });

    // https://stackoverflow.com/questions/322378/javascript-check-if-mouse-button-down
    canvas.addEventListener("mousedown", (event) => { if (event.button == 0) ++lmbDown; });
    canvas.addEventListener("mouseup", (event) => {if (event.button == 0) --lmbDown; selected = null; selectedLink = null; });

    // TODO: how does this work on mobile?
    canvas.addEventListener("mousemove", (event) => {
        let rect = event.target.getBoundingClientRect();
        mouseX = (event.clientX - rect.left) / rect.width;
        mouseY = (event.clientY - rect.top) / rect.height;
    });

    function findSelected() {        
        // Iterate circuits
        for (let i in circuits) {
            let currentCircuit = circuits[i];

            // Check if we're clicking a link
            let {inputPositions, outputPositions} = getLinkPositions(1.0, currentCircuit);
            
            for (let i = 0; i < inputPositions.length; i++) {
                let inputPos = inputPositions[i];

                if (circleContains(
                    inputPos[0],
                    inputPos[1],
                    LINK_SIZE * (1 + LINK_BORDER_WIDTH),
                    mouseX,
                    mouseY
                )) {
                    selectedLink = i;
                    selected = currentCircuit;
                }
            }

            for (let i = 0; i < outputPositions.length; i++) {
                let outputPos = outputPositions[i];

                if (circleContains(
                    outputPos[0],
                    outputPos[1],
                    LINK_SIZE * (1 + LINK_BORDER_WIDTH),
                    mouseX,
                    mouseY
                )) {
                    selectedLink = -i;
                    selected = currentCircuit;
                }
            }
            
            // Find circuit that was clicked on (if there was one)
            if (selectedLink == null && aabbContains(
                currentCircuit.position[0],
                currentCircuit.position[0] + CIRCUIT_SIZE,
                currentCircuit.position[1],
                currentCircuit.position[1] + getCircuitHeight(currentCircuit),
                mouseX,
                mouseY
            )) {
                selected = i;
            }
        }
    }

    // Returns {left, top, width, height}
    function getCircuitPosition(scale, circuit) {
        let x = circuit.position[0] * scale;
        let y = circuit.position[1] * scale;
        let width = scale * CIRCUIT_SIZE;
        let height = scale * getCircuitHeight();

        return {x, y, width, height};
    }

    // xOffset and yOffset in percentage of canvas
    function calculateLinkPositions(scale, xOffset, yOffset, count) {
        let spacing = getCircuitHeight() / count;
        let positions = Array(count);

        for (let i = 0; i < count; i++) {
            positions[i] = [xOffset * scale, (yOffset + i * spacing + spacing / 2) * scale];
        }

        return positions;
    }

    function getLinkPositions(scale, circuit) {
        let {x, y, width, height} = getCircuitPosition(1.0, circuit);

        let inputPositions = calculateLinkPositions(scale, x, y, circuit.inputLabels.length);
        let outputPositions = calculateLinkPositions(scale, x + width, y, circuit.outputLabels.length);

        return {inputPositions, outputPositions};
    }

    function drawCircuit(scale, circuit) {
        // Calculate draw coordinates
        let x = circuit.position[0] * scale * canvasWidth;
        let y = circuit.position[1] * scale * canvasHeight;
        let width = scale * CIRCUIT_SIZE * canvasWidth;
        let height = scale * getCircuitHeight() * canvasHeight;

        ctx.fillStyle = circuit.color;
        ctx.fillRect(x, y, width, height);

        // Iterate input labels and draw them
        let {inputPositions, outputPositions} = getLinkPositions(1.0, circuit);

        for (let i = 0; i < inputPositions.length; i++) {
            let pos = inputPositions[i];
            
            drawLinkNode(pos[0], pos[1], scale, false);
        }

        for (let i = 0; i < outputPositions.length; i++) {
            let pos = outputPositions[i];

            drawLinkNode(pos[0], pos[1], scale, false);
        }

        for (let i = 0; i < circuit.links.length; i++) {
            let link = circuit.links[i];

            let otherCircuit = circuits[link.circuit];
            let positions = getLinkPositions(1.0, otherCircuit);

            let ourNode = outputPositions[link.input];
            // TODO: why do i have to do such a roundabout thing
            let otherNode = positions.inputPositions[link.output];

            drawLinkWire(ourNode[0], ourNode[1], otherNode[0], otherNode[1], scale * canvasWidth);
        }
    }

    function drawCircuits(scale, circuits) {
        for (let id in circuits) {
            drawCircuit(scale, circuits[id]);
        }
    }

    function updateCircuitPosition() {
        canvasWidth = canvas.getBoundingClientRect().width;
        canvasHeight = canvas.getBoundingClientRect().height;

        if (selected != null && lmbDown) {
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