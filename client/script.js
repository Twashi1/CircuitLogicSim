// https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file

// TODO: delete/move input/output nodes
// TODO: right click/long press functionality
// TODO: palette of circuits
// TODO: add labels to gate links
// TODO: recursive circuits
// TODO: gates should be brighter
// TODO: should use some sort of map type instead of treating an object as a map

// TODO: canvas not centered

const FPS = 60;
const FPS_RATE = 1000 / FPS;
const SIMULATION_TICKS_PER_SECOND = 20;
const SIMULATION_RATE = 1000 / SIMULATION_TICKS_PER_SECOND;

class State {
    constructor(size) {
        this.size = size;
        this.memory = new Array(size).fill(false);
        this.currentIndex = 0;

        // https://stackoverflow.com/questions/21988909/is-it-possible-to-create-a-fixed-length-array-in-javascript
        if (Object.seal) {
            Object.seal(this.memory);
        }
    }

    allocate() {
        if (this.currentIndex == this.size) {
            throw new Error("Ran out of memory, too many inputs/outputs")
        }
    
        let allocated = this.currentIndex;
    
        this.currentIndex += 1;
    
        return allocated;
    }

    boundsCheck(index) {
        if (index >= 0 && index < this.size) return true;
        // TODO: very bad
        if (index == undefined || index == null) return false;

        throw new Error(`Out of bounds: ${index} >= ${this.size}`);        
    }

    setValue(index, value) {
        if (this.boundsCheck(index)) this.memory[index] = value;
    }
    
    getValue(index) {
        if (this.boundsCheck(index)) return this.memory[index];

        return false;
    }   
}

const LOGICAL_REPRESENTATION = {
    "inputSlots": [],
    "outputSlots": [],
    "operation": null,
    "children": []
};

function binaryOperation(representation, operation) {
    let a = globalState.getValue(representation.inputSlots[0]);
    let b = globalState.getValue(representation.inputSlots[1]);

    globalState.setValue(representation.outputSlots[0], operation(a, b));
}

function unaryOperation(representation, operation) {
    let a = globalState.getValue(representation.inputSlots[0]);

    globalState.setValue(representation.outputSlots[0], operation(a));
}

function recursiveGate(representation) {
    for (child of representation.children) {
        child.operation(child);
    }
}

const GATE_TYPE_AND = 0;
const GATE_TYPE_OR = 1;
const GATE_TYPE_NOT = 2;
const GATE_TYPE_RECURSIVE = 3;

const GATE_TYPE = {
    0: (representation) => binaryOperation(representation, (a, b) => a && b), // AND
    1: (representation) => binaryOperation(representation, (a, b) => a || b), // OR
    2: (representation) => unaryOperation(representation, (a) => !a),         // NOT
    3: recursiveGate
};

function convertCircuitToLogicalRepresenation(populatedList, circuitRepresentations, circuitID, circuits, prevCircuitOutputSlot, prevCircuitOutputSlotIndex, representation)
{
    let circuitAlreadyExisted = circuitID in circuitRepresentations;
    let circuitRepresentation = circuitAlreadyExisted ? circuitRepresentations[circuitID] : JSON.parse(JSON.stringify(LOGICAL_REPRESENTATION));

    if (circuitID in populatedList) return circuitRepresentation;

    // Check if circuit is populated
    // If the circuit is new, it is by definition unpopulated
    let isPopulated = circuitAlreadyExisted;

    for (let inputSlotIndex in circuitRepresentation.inputSlots) {
        if (circuitRepresentation.inputSlots[inputSlotIndex] == null) {
            isPopulated = false;
            break;
        }
    }

    // If circuit is already populated, exit
    if (isPopulated)
    {
        populatedList.push(circuitID);
        return circuitRepresentation;
    }

    let circuit = circuits[circuitID];

    // Populate basic properties like the operation, the state to use, and the output slots
    if (!circuitAlreadyExisted) {
        // Get the operation the gate performs
        circuitRepresentation.operation = GATE_TYPE[circuit.type];
        // Generate output slots (as many as there are output labels)
        for (let i = 0; i < circuit.outputLabels.length; i++) {
            circuitRepresentation.outputSlots.push(
                globalState.allocate()
            );
        }
        // Generate input slots
        for (let i = 0; i < circuit.inputLabels.length; i++) {
            circuitRepresentation.inputSlots.push(
                null
            );
        }

        circuitRepresentations[circuitID] = circuitRepresentation;
    }
    // Read input slot
    // Would be null for a circuit that reads from an input node or output node
    if (prevCircuitOutputSlot != null && prevCircuitOutputSlotIndex != null) {
        circuitRepresentation.inputSlots[prevCircuitOutputSlotIndex] = prevCircuitOutputSlot;
    }

    for (let linkIndex in circuit.links) {
        let link = circuit.links[linkIndex];

        circuitRepresentations[link.circuit] = convertCircuitToLogicalRepresenation(
            populatedList,
            circuitRepresentations,
            link.circuit,
            circuits,
            circuitRepresentation.outputSlots[link.input],
            link.output, // Refers to the input slot index within the linked circuit
            representation
        );
    }

    return circuitRepresentation;
}

function convertToLogicalRepresentation(circuits, inputNodes, outputNodes) {
    let representation = JSON.parse(JSON.stringify(LOGICAL_REPRESENTATION));
    globalState = new State(1024);

    // Maps circuit IDs to the logical representation of that circuit
    let circuitRepresentations = {};
    // List of circuit IDs that are fully populated
    let populatedList = [];

    // Iterate input nodes
    for (let inputID in inputNodes) {
        let inputNode = inputNodes[inputID];
        let inputSlot = globalState.allocate();
        // Populate input slots of logical representation
        representation.inputSlots.push(inputSlot);

        // Iterate links of each input node
        for (let linkIndex in inputNode.links) {
            let link = inputNode.links[linkIndex];

            // Load circuit representation
            let circuitRepresentation = convertCircuitToLogicalRepresenation(populatedList, circuitRepresentations, link.circuit, circuits, null, null, representation);
            // Populate input slot of circuit
            circuitRepresentation.inputSlots[link.output] = inputSlot;
        }
    }

    for (let outputID in outputNodes) {
        // Populate output slots of logical representation
        let outputNode = outputNodes[outputID];
        let outputSlotIndex = representation.outputSlots.length;

        representation.outputSlots.push(null);

        // TODO: should only be 0 or 1 links
        for (let linkIndex in outputNode.links) {
            let link = outputNode.links[linkIndex];

            // Load circuit representation
            let circuitRepresentation = convertCircuitToLogicalRepresenation(populatedList, circuitRepresentations, link.circuit, circuits, null, null, representation);
            // Populate output slot of representation
            representation.outputSlots[outputSlotIndex] = circuitRepresentation.outputSlots[link.input];
        }
    }

    // Add circuitRepresentations as children to the principal representation
    for (let circuitID in circuitRepresentations) {
        representation.children.push(circuitRepresentations[circuitID]);
    }

    // Set operation to recursive
    representation.operation = GATE_TYPE[GATE_TYPE_RECURSIVE];

    return representation;
}

const BACKGROUND_COLOR = "#cccccc";
const NODE_REGION_COLOR = "#aaaaaa";

const CIRCUIT_INACTIVE_LINK_COLOR = "#444444";
const CIRCUIT_ACTIVE_LINK_COLOR = "#888888";
const CIRCUIT_LINK_BORDER_COLOR = "#222222";
const CIRCUIT_LINK_WIRE_COLOR = "#999999";

const CIRCUIT_ACTIVE_NODE_COLOR = "#dd0000";
const CIRCUIT_INACTIVE_NODE_COLOR = "#444444";
const CIRCUIT_NODE_BORDER_COLOR = "#222222";

const MAX_IDS = 100_000_000;
const MAX_ID_GENERATION_LOOPS = 1_000;

let circuits = {};

// Each node consists of
// "state": current value
// "position": y coordinate
// "links": just like circuit links

let inputNodes = {};
let outputNodes = {};
let circuitChanged = true; // Has circuit changed since last simulation tick
let currentLogicalRepresenation = null; // The current logical representation of the circuit, updated each time a change is made
let globalState = new State(1024);

const WEBSITE_URL = "http://127.0.0.1:8090";

function getCircuitButtonClick() {
    fetch(WEBSITE_URL + "/circuit")
        .then(async (response) => {
            let circuitText = await response.text();
            let circuitData = JSON.parse(circuitText);

            circuits = circuitData["circuits"];
            inputNodes = circuitData["inputNodes"];
            outputNodes = circuitData["outputNodes"];
        });
}

function saveCircuitButtonClick() {
    let circuitName = document.getElementById("circuitNameInput").value;

    // TODO: doubt this will stop bad inputs
    // TODO: send error message, some visual feedback
    // Check string is not empty
    if (circuitName.length == 0) {
        return;
    }
    // Check string is alpha numeric
    if (!circuitName.match(/^[a-zA-Z0-9]+$/)) {
        return;
    }

    // https://developer.mozilla.org/en-US/docs/Web I/XMLHttpRequest/send
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/saveCircuit", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {}
    };
    xhr.send(JSON.stringify(
        {
            "data": {"circuits": circuits, "inputNodes": inputNodes ,"outputNodes": outputNodes},
            "name": circuitName
        }
    ));
}

const SCALE_MINIMUM = 0.1;
const SCALE_MAXIMUM = 2;
let scale = 1.0;

// Selected circuit
let selectedCircuitID = null;
// Selected link
let selectedLinkIndex = null;
let selectedLinkIsInput = null;
// Selected node
let selectedNodeID = null;
let selectedNodeIsInput = null;

let mouseX = 0;
let mouseY = 0;

let canvasWidth = 0;
let canvasHeight = 0;
let canvasRect = null;

const CIRCUIT_SIZE = 0.1;

const NODE_SIZE = 0.015;
const NODE_BORDER_WIDTH = 0.1;
const NODE_RADIUS = (NODE_SIZE + NODE_SIZE * NODE_BORDER_WIDTH) / 2;

const LINK_SIZE = 0.01;
const LINK_BORDER_WIDTH = 0.2;
const LINK_RADIUS = (LINK_SIZE + LINK_SIZE * LINK_BORDER_WIDTH) / 2;

const WIRE_WIDTH = 0.005;

// https://stackoverflow.com/questions/322378/javascript-check-if-mouse-button-down
let lmbDown = 0;
let rmbDown = 0;
let lmbHeldTime = 0;
let lmbLastShortClickTimestamp = 0;

const LONG_PRESS_MINIMUM_ELAPSED = 1;
const DOUBLE_TAP_MAXIMUM_ELAPSED = 0.2;

// TODO: use
let primaryAction = false;
let secondaryAction = false;
let tertiaryAction = false;

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

// Inclusive
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateID(object) {
    let newID = null;
    let genCount = 0;

    while (genCount++ < MAX_ID_GENERATION_LOOPS && (object.hasOwnProperty(newID) || newID == null)) {
        newID = randomInteger(0, MAX_IDS);
    }

    if (newID == null) {
        // TODO: something other than big error
        console.log("Big error, failed to generate an ID");
    }

    return newID;
}

function addInitialPaletteButtons() {
    document.querySelectorAll("#paletteButton").forEach((button) => {
        let onclickFunction;
        let circuitType = parseInt(button.dataset.circuittype);

        switch (circuitType) {
            case GATE_TYPE_AND: onclickFunction = () => {
                let inputs = new Array(2);
                inputs[0] = "A";
                inputs[1] = "B";
                let outputs = new Array(1);
                outputs[0] = "C";

                spawnCircuit(GATE_TYPE_AND, inputs, outputs, null);
            }; break;
            case GATE_TYPE_OR: onclickFunction = () => {
                let inputs = new Array(2);
                inputs[0] = "A";
                inputs[1] = "B";
                let outputs = new Array(1);
                outputs[0] = "C";

                spawnCircuit(GATE_TYPE_OR, inputs, outputs, null);
            }; break;
            case GATE_TYPE_NOT: onclickFunction = () => {
                let inputs = new Array(1);
                inputs[0] = "A";
                let outputs = new Array(1);
                outputs[0] = "B";

                spawnCircuit(GATE_TYPE_NOT, inputs, outputs, null);
            }; break;
            default:
                console.log("Couldn't populate palette buttons");
                break;
        }

        if (onclickFunction != undefined) {
            button.addEventListener("click", onclickFunction);
        }
    });
}

function randomColor(lower=0, upper=255) {
    let r = randomInteger(lower, upper).toString(16);
    let g = randomInteger(lower, upper).toString(16);
    let b = randomInteger(lower, upper).toString(16);

    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;

    return `#${r}${g}${b}`;
}

function spawnCircuit(type, inputLabels, outputLabels, representation) {
    circuits[generateID(circuits)] = {
        "color": randomColor(),
        "position": [0.5, 0.5],
        "inputLabels": inputLabels,
        "outputLabels": outputLabels,
        "links": [],
        "type": type,
        "representation": representation
    };
}

function scaleRange(value, min, max) {
    return value * (max - min) + min;
}

function changeScaleSliderValue() {
    let sliderValue = document.getElementById("circuitScaleInput").value / 100;
    scale = scaleRange(sliderValue, SCALE_MINIMUM, SCALE_MAXIMUM);

    document.getElementById("circuitScaleValue").innerHTML = scale;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("circuitButton").addEventListener("click", getCircuitButtonClick);
    document.getElementById("saveCircuitButton").addEventListener("click", saveCircuitButtonClick);
    document.getElementById("circuitScaleInput").addEventListener("input", changeScaleSliderValue);

    document.getElementById("circuitScaleInput").value = (1.0 - SCALE_MINIMUM) / (SCALE_MAXIMUM - SCALE_MINIMUM);

    addInitialPaletteButtons();

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // Fit to container div
    // https://stackoverflow.com/questions/10214873/make-canvas-as-wide-and-as-high-as-parent#:~:text=If%20you%20want%20the%20canvas,display%20size%20of%20the%20canvas.
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);

    // TODO: how does this work on mobile?
    canvas.addEventListener("mousemove", (event) => {
        // TODO: get correct left and top
        mouseX = (event.clientX - canvasRect.left) / canvasRect.width;
        mouseY = (event.clientY - canvasRect.top) / canvasRect.height;
    });

    function mouseDown(event) {
        if (event.button == 0) {
            lmbDown = true;
            findSelected(true);
        }

        if (event.button == 1) {
            secondaryAction = true;

            findSelected(false);
        }
    }

    function mouseUp(event) {
        // TODO: gotta re-do all of this to make logic way cleaner
        if (event.button == 0) lmbDown = false;
        if (event.button == 1) secondaryAction = false;

        // Record what circuit and link they selected before
        let oldNodeID = selectedNodeID;
        let oldNodeIsInput = selectedNodeIsInput;
        let oldCircuit = selectedCircuitID;
        let oldLink = selectedLinkIndex;
        let oldLinkIsInput = selectedLinkIsInput;

        // Check if they have a circuit/link selected right now
        if (event.button == 0) findSelected(true);
        else findSelected(false);

        // Check we haven't clicked on an existing input/output node
        if (selectedNodeID == null) {
            // Create input/output nodes
            if (mouseX < getNodeRegionWidth()) {
                let newID = generateID(inputNodes);
    
                inputNodes[newID] = {
                    "state": 0,
                    "position": mouseY,
                    "links": []
                };
            }
            else if (mouseX > (1 - getNodeRegionWidth())) {
                let newID = generateID(outputNodes);
    
                outputNodes[newID] = {
                    "state": 0,
                    "position": mouseY,
                    "links": []
                };    
            }
        }

        // If they did select a link/circuit
        if (selectedCircuitID != null && selectedLinkIndex != null && oldLink != null && oldCircuit != null) {
            // If they clicked on a link thats an input link we should clear it
            if (oldLink == selectedLinkIndex && oldCircuit == selectedCircuitID) {
                // We need to clear the input to this circuit
                if (selectedLinkIsInput) {
                    clearLink(selectedCircuitID, selectedLinkIndex);
                }
            }

            // Check either the link is unique, or the circuit is unique, and one link is an input, while the other is an output
            if ((oldLink != selectedLinkIndex || oldCircuit != selectedCircuitID) && oldLinkIsInput == !selectedLinkIsInput) {
                // TODO: order in terms of which is input, which is output
                // or don't allow at all if the oldCircuit/oldLink is an input
                if (selectedLinkIsInput) {
                    addLink(oldCircuit, oldLink, selectedCircuitID, selectedLinkIndex);
                } else {
                    addLink(selectedCircuitID, selectedLinkIndex, oldCircuit, oldLink);
                }
            }
        }

        // Check if they selected an output link and then selected an output node
        if (oldCircuit != null && oldLink != null && !oldLinkIsInput && selectedNodeID != null && !selectedNodeIsInput) {
            addOutputNodeLink(selectedNodeID, oldCircuit, oldLink);
        }

         // They clicked on an output node, so delete that connection
         if (oldNodeID == selectedNodeID && selectedNodeID != null && !oldNodeIsInput && !selectedNodeIsInput) {
            outputNodes[selectedNodeID].links = [];
            circuitChanged = true;
        }

        // If they clicked on an input node, toggle state
        if (oldNodeID == selectedNodeID && selectedNodeID != null && oldNodeIsInput && selectedNodeIsInput) {
            inputNodes[selectedNodeID].state = !inputNodes[selectedNodeID].state;
        }

        // If they had selected a node, and then selected a link
        if (oldNodeID != null && selectedCircuitID != null && selectedLinkIndex != null) {
            // If they selected an input node and input link
            if (oldNodeIsInput && selectedLinkIsInput) {
                addInputNodeLink(oldNodeID, selectedCircuitID, selectedLinkIndex);
            }
            // If they selected an output node and output link
            else if (!oldNodeIsInput && !selectedLinkIsInput) {
                addOutputNodeLink(oldNodeID, selectedCircuitID, selectedLinkIndex);
            }
        }        

        clearSelected();
    }

    function addInputNodeLink(nodeID, circuitID, linkIndex) {
        let inputNode = inputNodes[nodeID];

        inputNode.links.push({
            "circuit": circuitID,
            "input": null,
            "output": linkIndex
        });

        circuitChanged = true;
    }

    function addOutputNodeLink(nodeID, circuitID, linkIndex) {
        let outputNode = outputNodes[nodeID];

        outputNode.links = [{
            "circuit": circuitID,
            "input": linkIndex,
            "output": null
        }];
    
        circuitChanged = true;
    }

    function clearSelected() {
        selectedCircuitID = null;
        selectedLinkIndex = null;
        selectedLinkIsInput = null;
        selectedNodeID = null;
        selectedNodeIsInput = null;
    }

    function getSelectedNodeIDForType(nodeContainerObject) {
        for (let nodeID in nodeContainerObject) {
            let node = nodeContainerObject[nodeID];

            let nodeY = node.position;

            if (circleContains(0, nodeY, NODE_RADIUS, 0, mouseY))
                return nodeID;
        }

        return null;
    }   

    function findSelected(checkPrimaryAction) {      
        if (checkPrimaryAction) {
            // Check if we're selecting a node
            if (mouseX < getNodeRegionWidth() || mouseX > (1 - getNodeRegionWidth())) {
                selectedNodeID = getSelectedNodeIDForType(mouseX < getNodeRegionWidth() ? inputNodes : (mouseX > (1 - getNodeRegionWidth()) ? outputNodes : {}));

                if (selectedNodeID != null) {
                    selectedNodeIsInput = mouseX < getNodeRegionWidth() ? true : (mouseX > (1 - getNodeRegionWidth()) ? false : null);
                }
            }
            else {
                // Iterate circuits
                for (let circuitID in circuits) {
                    let currentCircuit = circuits[circuitID];

                    // Check if we're clicking a link
                    let inputPositions = getLinkPositions(currentCircuit, true);
                    let outputPositions = getLinkPositions(currentCircuit, false);
                    
                    for (let i = 0; i < inputPositions.length; i++) {
                        let inputPos = inputPositions[i];

                        if (circleContains(
                            inputPos[0],
                            inputPos[1],
                            LINK_RADIUS,
                            mouseX,
                            mouseY
                        )) {
                            selectedLinkIndex = i;
                            selectedLinkIsInput = true;
                            selectedCircuitID = circuitID;
                        }
                    }

                    for (let i = 0; i < outputPositions.length; i++) {
                        let outputPos = outputPositions[i];

                        if (circleContains(
                            outputPos[0],
                            outputPos[1],
                            LINK_RADIUS,
                            mouseX,
                            mouseY
                        )) {
                            selectedLinkIndex = i;
                            selectedLinkIsInput = false;
                            selectedCircuitID = circuitID;
                        }
                    }
                
                    // Find circuit that was clicked on (if there was one)
                    if (selectedLinkIndex == null && aabbContains(
                        currentCircuit.position[0] - getCircuitWidth(currentCircuit) / 2,
                        currentCircuit.position[0] + getCircuitWidth(currentCircuit) / 2,
                        currentCircuit.position[1] - getCircuitHeight(currentCircuit) / 2,
                        currentCircuit.position[1] + getCircuitHeight(currentCircuit) / 2,
                        mouseX,
                        mouseY
                    )) {
                        selectedCircuitID = circuitID;
                    }
                }
            }
        }
        else {
            // TODO: secondary action checking
        }
    }

    function clearLink(outputCircuitID, outputIndex) {
        let foundLink = false;

        // TODO: can we break here?
        for (let circuitID in circuits) {
            let circuit = circuits[circuitID];

            for (let i = 0; i < circuit.links.length; i++) {
                let link = circuit.links[i];

                if (link.circuit == outputCircuitID && link.output == outputIndex) {
                    circuit.links.splice(i, 1);

                    foundLink = true;
                }
            }
        }

        // Check that the link is not coming from an input node
        if (!foundLink) {
            for (let inputNodeID in inputNodes) {
                let inputNode = inputNodes[inputNodeID];

                for (let i = 0; i < inputNode.links.length; i++) {
                    let link = inputNode.links[i];

                    if (link.circuit == outputCircuitID && link.output == outputIndex) {
                        inputNode.links.splice(i, 1);
                    }
                }
            }
        }

        circuitChanged = true;
    }

    function addLink(inputCircuitID, inputIndex, outputCircuitID, outputIndex) {
        // TODO: Search for that node being set in input circuit
        // TODO: Search for that node being set in output circuit

        let inputCircuit = circuits[inputCircuitID];

        inputCircuit.links.push({
            "circuit": outputCircuitID,
            "input": inputIndex,
            "output": outputIndex
        });

        circuitChanged = true;
    }

    function getCircuitHeight(circuit) {
        // return CIRCUIT_SIZE * Math.max(circuit.inputLabels.length, circuit.outputLabels.length, 1) * scale;
        return CIRCUIT_SIZE * scale;
    }

    // TODO: could multiply by length of the name of the circuit, but maybe we have horizontal names for longer circuits?
    function getCircuitWidth(circuit) {
        return CIRCUIT_SIZE * scale;
    }

    function getLinkPositions(circuit, isInput) {
        let count = isInput ? circuit.inputLabels.length : circuit.outputLabels.length;
        let positions = Array(count);
        let xOffset = (isInput ? 0 : getCircuitWidth(circuit));
        // Don't have to worry about divide by zero, since we will return empty array anyway
        let ySpacing = getCircuitHeight(circuit) / count;
        
        let left = circuit.position[0] - getCircuitWidth(circuit) / 2;
        let bottom = circuit.position[1] - getCircuitHeight(circuit) / 2;

        for (let i = 0; i < count; i++) {
            positions[i] = [left + xOffset, bottom + ySpacing * i + ySpacing / 2];
        }

        return positions;
    }

    function getNodeRegionWidth() {
        return NODE_RADIUS * 2 * scale;
    }

    function getNodeX(isInput) {
        return (isInput ? NODE_RADIUS * scale : 1 - NODE_RADIUS * scale);
    }

    function drawLinkNode(x, y, linked) {
        ctx.beginPath();
        ctx.arc(x * canvasWidth, y * canvasHeight, scale * LINK_RADIUS * canvasWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = linked ? CIRCUIT_ACTIVE_LINK_COLOR : CIRCUIT_INACTIVE_LINK_COLOR;
        ctx.fill();
        ctx.lineWidth = scale * LINK_SIZE * LINK_BORDER_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_LINK_BORDER_COLOR;
        ctx.stroke();
    }

    function drawIONode(x, y, active) {
        ctx.beginPath();
        ctx.arc(x * canvasWidth, y * canvasHeight, scale * NODE_RADIUS * canvasWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = active ? CIRCUIT_ACTIVE_NODE_COLOR : CIRCUIT_INACTIVE_NODE_COLOR;
        ctx.fill();
        ctx.lineWidth = scale * NODE_SIZE * NODE_BORDER_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_NODE_BORDER_COLOR;
        ctx.stroke();
    }

    function drawWire(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0 * canvasWidth, y0 * canvasHeight);
        ctx.lineTo(x1 * canvasWidth, y1 * canvasHeight);
        ctx.lineWidth = scale * WIRE_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_LINK_WIRE_COLOR;
        ctx.stroke();
    }
    
    function clearScreen() {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = NODE_REGION_COLOR;
        ctx.fillRect(0, 0, getNodeRegionWidth() * canvasWidth, canvasHeight);
        ctx.fillRect((1 - getNodeRegionWidth()) * canvasWidth, 0, canvasWidth, canvasHeight);
    }

    function drawCircuit(circuit) {
        console.log(`Drawing circuit: ${circuit}`);

        let x = circuit.position[0];
        let y = circuit.position[1];

        let width = getCircuitWidth(circuit);
        let height = getCircuitHeight(circuit);

        let left = x - width / 2;
        let bottom = y - width / 2;

        ctx.fillStyle = circuit.color;
        ctx.fillRect(left * canvasWidth, bottom * canvasHeight, width * canvasWidth, height * canvasHeight);

        // Iterate links and draw them
        let inputPositions = getLinkPositions(circuit, true);
        let outputPositions = getLinkPositions(circuit, false);

        // TODO: read whether or not a node is linked, and change color
        // or read the state of that node to draw color (maybe more useful)
        for (let i = 0; i < inputPositions.length; i++) {
            let pos = inputPositions[i];
            
            drawLinkNode(pos[0], pos[1], false);
        }

        for (let i = 0; i < outputPositions.length; i++) {
            let pos = outputPositions[i];

            drawLinkNode(pos[0], pos[1], false);
        }

        // Draw wires
        for (let i = 0; i < circuit.links.length; i++) {
            let link = circuit.links[i];

            let otherCircuit = circuits[link.circuit];
            let otherCircuitInputPositions = getLinkPositions(otherCircuit, true);

            let ourNode = outputPositions[link.input];
            let otherNode = otherCircuitInputPositions[link.output];

            drawWire(ourNode[0], ourNode[1], otherNode[0], otherNode[1]);
        }
    }

    function drawNodes(inputNodes, outputNodes) {
        for (let nodeID in inputNodes) {
            let node = inputNodes[nodeID];

            let position = [getNodeX(true), node.position];

            drawIONode(position[0], position[1], node.state);

            for (let linkIndex in node.links) {
                let link = node.links[linkIndex];

                let inputPositions = getLinkPositions(circuits[link.circuit], true);
                let otherNode = inputPositions[link.output];

                drawWire(position[0], position[1], otherNode[0], otherNode[1]);
            }
        }

        for (let nodeID in outputNodes) {
            let node = outputNodes[nodeID];

            let position = [getNodeX(false), node.position];

            drawIONode(position[0], position[1], node.state);

            for (let linkIndex in node.links) {
                let link = node.links[linkIndex];

                let outputPositions = getLinkPositions(circuits[link.circuit], false);
                let otherNode = outputPositions[link.input];

                drawWire(position[0], position[1], otherNode[0], otherNode[1]);
            }
        }

        // Draw from the selected node to the cursor
        if (selectedNodeID != null) {
            let node = selectedNodeIsInput ? inputNodes[selectedNodeID] : outputNodes[selectedNodeID];
            
            drawWire(getNodeX(selectedNodeIsInput), node.position, mouseX, mouseY);
        }
    }

    function drawCircuits(circuits) {
        for (let id in circuits) {
            drawCircuit(circuits[id]);
        }

        // Draw from the selected circuit/link to the cursor
        if (selectedCircuitID != null && selectedLinkIndex != null) {
            let circuit = circuits[selectedCircuitID];

            let startNode = getLinkPositions(circuit, selectedLinkIsInput)[selectedLinkIndex];

            drawWire(startNode[0], startNode[1], mouseX, mouseY);
        }
    }

    function updateCircuitPosition() {
        let canvasBorderDiv = document.getElementById("canvasBorder");
        let rect = canvasBorderDiv.getBoundingClientRect();

        // TODO: bad place to put this
        canvasWidth = canvasBorderDiv.offsetWidth;
        canvasHeight = canvasBorderDiv.offsetHeight;
        canvasRect = rect;

        if (selectedCircuitID != null && lmbDown && selectedLinkIndex == null) {
            let newPosition = [mouseX, mouseY];

            if (newPosition[0] <= getNodeRegionWidth() || newPosition[0] + getCircuitWidth(circuits[selectedCircuitID]) >= (1 - getNodeRegionWidth())) {
                return;
            }

            circuits[selectedCircuitID].position = newPosition;
        }
    }

    function simulateCircuit() {
        if (circuitChanged || currentLogicalRepresenation == null) {
            // Convert circuit to logical representation
            currentLogicalRepresenation = convertToLogicalRepresentation(circuits, inputNodes, outputNodes);

            circuitChanged = false;
        }
        
        // Read state of input nodes and write into representation's state
        let inputNodeIndex = 0;

        for (let inputNodeID in inputNodes) {
            let inputNodeValue = inputNodes[inputNodeID].state;
            let inputSlot = currentLogicalRepresenation.inputSlots[inputNodeIndex];
            
            globalState.setValue(inputSlot, inputNodeValue);

            inputNodeIndex++;
        }

        // Simulate circuit
        currentLogicalRepresenation.operation(currentLogicalRepresenation);

        // Read values of state to output nodes
        let outputNodeIndex = 0;

        for (let outputNodeID in outputNodes) {
            let outputSlot = currentLogicalRepresenation.outputSlots[outputNodeIndex];
            let outputSlotValue = globalState.getValue(outputSlot);

            outputNodes[outputNodeID].state = outputSlotValue;

            outputNodeIndex++;
        }
    }

    function simulationTick() {
        simulateCircuit();
    }

    function update() {
        updateCircuitPosition();
        draw();
    }

    function draw() {
        clearScreen();
        drawCircuits(circuits);
        drawNodes(inputNodes, outputNodes);
    }

    // 60 fps
    window.setInterval(update, FPS_RATE);
    window.setInterval(simulationTick, SIMULATION_RATE);
});