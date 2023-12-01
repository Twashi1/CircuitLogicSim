// https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file

class State {
    constructor(size) {
        this.size = size;
        this.memory = new Array(size).fill(0);
        this.currentIndex = 0;

        // https://stackoverflow.com/questions/21988909/is-it-possible-to-create-a-fixed-length-array-in-javascript
        if (Object.seal) {
            Object.seal(this.memory);
        }
    }

    allocate() {
        if (this.currentIndex == this.size) {
            throw RuntimeError("Ran out of memory, too many inputs/outputs")
        }
    
        let allocated = this.currentIndex;
    
        this.currentIndex += 1;
    
        return allocated;
    }

    setValue(index, value) {
        if (index != -1) this.memory[index] = value;
    }
    
    getValue(index) {
        if (index != -1) return this.memory[index];

        return 0;
    }   
}

const AND_OPERATION = (a, b) => a & b;
const OR_OPERATION = (a, b) => a | b;
const NOT_OPERATION = (a) => ~a;

const LOGICAL_REPRESENTATION = {
    "inputSlots": [],
    "outputSlots": [],
    "state": null,
    "operation": null,
    "children": []
};

// TODO: probably a better name for this
function incompleteBinaryGate(representation, operation) {
    let a = representation.state.getValue(representation.inputSlots[0]);
    let b = representation.state.getValue(representation.inputSlots[1]);

    representation.state.setValue(representation.outputSlots[0], operation(a, b));
}

function incompleteUnaryGate(representation, operation) {
    representation.state.setValue(representation.outputSlots[0], operation(representation.state.getValue(representation.inputSlots[0])));
}

function andGate(representation) {
    incompleteBinaryGate(representation, AND_OPERATION);
}

function orGate(representation) {
    incompleteBinaryGate(representation, OR_OPERATION);
}

function notGate(representation) {
    incompleteUnaryGate(representation, NOT_OPERATION);
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
    0: andGate,
    1: orGate,
    2: notGate,
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
        // Use same state as our representation
        circuitRepresentation.state = representation.state;
        // Generate output slots (as many as there are output labels)
        for (let i = 0; i < circuit.outputLabels.length; i++) {
            circuitRepresentation.outputSlots.push(
                representation.state.allocate()
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
    representation.state = new State(1024);

    // Maps circuit IDs to the logical representation of that circuit
    let circuitRepresentations = {};
    // List of circuit IDs that are fully populated
    let populatedList = [];

    // Iterate input nodes
    for (let inputID in inputNodes) {
        let inputNode = inputNodes[inputID];
        let inputSlot = representation.state.allocate();
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

// TODO: should use some sort of map type instead of treating an object as a map
// TODO: palette of circuits

let circuits = {
    "0": {
        "color": "#00ff00",
        "position": [
            0.1,
            0.1
        ],
        "inputLabels": [
            "a",
            "b"
        ],
        "outputLabels": [
            "c"
        ],
        "links": [],
        "type": GATE_TYPE_AND,
        "representation": null
    },
    "1": {
        "color": "#0000ff",
        "position": [
            0.3,
            0.1
        ],
        "inputLabels": [
            "a",
            "b"
        ],
        "outputLabels": [
            "d"
        ],
        "links": [],
        "type": GATE_TYPE_OR,
        "representation": null
    }
};

// Each node consists of
// "state": current value
// "position": y coordinate
// "links": just like circuit links

let inputNodes = {
    "6780338": {
        "state": 0,
        "position": 0.21494046892438617,
        "links": [
            {
                "circuit": "0",
                "input": null,
                "output": 1
            }
        ]
    },
    "44789993": {
        "state": 0,
        "position": 0.12494046892438616,
        "links": [
            {
                "circuit": "0",
                "input": null,
                "output": 0
            }
        ]
    }
};

let outputNodes = {
    "86422345": {
        "state": 0,
        "position": 0.2706547546386719,
        "links": [
            {
                "circuit": "0",
                "input": 0,
                "output": null
            }
        ]
    }
};

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

const CIRCUIT_SIZE = 0.1;

const NODE_SIZE = 0.02;
const NODE_BORDER_WIDTH = 0.2;

const LINK_SIZE = 0.01;
const LINK_WIRE_WIDTH = 0.01;
const LINK_BORDER_WIDTH = 0.2;

const INPUT_NODE_POSITION = NODE_SIZE * 2;
const OUTPUT_NODE_POSITION = 1 - INPUT_NODE_POSITION;

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

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);

    function drawLinkNode(x, y, scale, linked) {
        ctx.beginPath();
        ctx.arc(x * scale * canvasWidth, y * scale * canvasWidth, scale * LINK_SIZE * canvasWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = linked ? CIRCUIT_ACTIVE_LINK_COLOR : CIRCUIT_INACTIVE_LINK_COLOR;
        ctx.fill();
        ctx.lineWidth = scale * LINK_SIZE * LINK_BORDER_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_LINK_BORDER_COLOR;
        ctx.stroke();
    }

    function drawIONode(x, y, scale, active) {
        ctx.beginPath();
        ctx.arc(x * scale * canvasWidth, y * scale * canvasWidth, scale * NODE_SIZE * canvasWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = active ? CIRCUIT_ACTIVE_NODE_COLOR : CIRCUIT_INACTIVE_NODE_COLOR;
        ctx.fill();
        ctx.lineWidth = scale * NODE_SIZE * NODE_BORDER_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_NODE_BORDER_COLOR;
        ctx.stroke();
    }

    function drawLinkWire(x0, y0, x1, y1, scale) {
        ctx.beginPath();
        ctx.moveTo(x0 * scale * canvasWidth, y0 * scale * canvasWidth);
        ctx.lineTo(x1 * scale * canvasWidth, y1 * scale * canvasWidth);
        ctx.lineWidth = scale * LINK_WIRE_WIDTH * canvasWidth;
        ctx.strokeStyle = CIRCUIT_LINK_WIRE_COLOR;
        ctx.stroke();
    }
    
    function clearScreen() {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = NODE_REGION_COLOR;
        ctx.fillRect(0, 0, INPUT_NODE_POSITION * canvasWidth, canvasHeight);
        ctx.fillRect(OUTPUT_NODE_POSITION * canvasWidth, 0, canvasWidth, canvasHeight);
    }

    // TODO: how does this work on mobile?
    canvas.addEventListener("mousemove", (event) => {
        let rect = event.target.getBoundingClientRect();
        mouseX = (event.clientX - rect.left) / rect.width;
        mouseY = (event.clientY - rect.top) / rect.height;
    });

    function mouseDown(event) {
        if (event.button == 0) ++lmbDown;
        
        findSelected();
    }

    function mouseUp(event) {
        if (event.button == 0) --lmbDown;

        // Record what circuit and link they selected before
        let oldNodeID = selectedNodeID;
        let oldNodeIsInput = selectedNodeIsInput;
        let oldCircuit = selectedCircuitID;
        let oldLink = selectedLinkIndex;
        let oldLinkIsInput = selectedLinkIsInput;

        // Check if they have a circuit/link selected right now
        findSelected();

        // Check we haven't clicked on an existing input/output node
        if (selectedNodeID == null) {
            // Create input/output nodes
            if (mouseX < INPUT_NODE_POSITION) {
                let newID = generateID(inputNodes);
    
                inputNodes[newID] = {
                    "state": 0,
                    "position": mouseY,
                    "links": []
                };
            }
            else if (mouseX > OUTPUT_NODE_POSITION) {
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
        }

        // If they clicked on an input node, toggle state
        if (oldNodeID == selectedNodeID && selectedNodeID != null && oldNodeIsInput && selectedNodeIsInput) {
            inputNodes[selectedNodeID].state = ~inputNodes[selectedNodeID].state;
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
    }

    function addOutputNodeLink(nodeID, circuitID, linkIndex) {
        let outputNode = outputNodes[nodeID];

        outputNode.links = [{
            "circuit": circuitID,
            "input": linkIndex,
            "output": null
        }];
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

            if (circleContains(0, nodeY, NODE_SIZE, 0, mouseY))
                return nodeID;
        }

        return null;
    }   

    function findSelected() {      
        // Check if we're selecting a node
        if (mouseX < INPUT_NODE_POSITION || mouseX > OUTPUT_NODE_POSITION) {
            selectedNodeID = getSelectedNodeIDForType(mouseX < INPUT_NODE_POSITION ? inputNodes : (mouseX > OUTPUT_NODE_POSITION ? outputNodes : {}));

            if (selectedNodeID != null) {
                selectedNodeIsInput = mouseX < INPUT_NODE_POSITION ? true : (mouseX > OUTPUT_NODE_POSITION ? false : null);
            }
        }
        else {
            // Iterate circuits
            for (let circuitID in circuits) {
                let currentCircuit = circuits[circuitID];

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
                        LINK_SIZE * (1 + LINK_BORDER_WIDTH),
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
                    currentCircuit.position[0],
                    currentCircuit.position[0] + CIRCUIT_SIZE,
                    currentCircuit.position[1],
                    currentCircuit.position[1] + getCircuitHeight(currentCircuit),
                    mouseX,
                    mouseY
                )) {
                    selectedCircuitID = circuitID;
                }
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

            drawLinkWire(ourNode[0], ourNode[1], otherNode[0], otherNode[1], scale);
        }
    }

    function drawNodes(scale, inputNodes, outputNodes) {
        for (let nodeID in inputNodes) {
            let node = inputNodes[nodeID];

            let position = [0.0, node.position];

            drawIONode(position[0], position[1], scale, node.state);

            for (let linkIndex in node.links) {
                let link = node.links[linkIndex];

                let positions = getLinkPositions(1.0, circuits[link.circuit]);
                let otherNode = positions.inputPositions[link.output];

                drawLinkWire(position[0], position[1], otherNode[0], otherNode[1], scale);
            }
        }

        for (let nodeID in outputNodes) {
            let node = outputNodes[nodeID];

            let position = [1.0, node.position];

            drawIONode(position[0], position[1], scale, node.state);

            for (let linkIndex in node.links) {
                let link = node.links[linkIndex];

                let positions = getLinkPositions(1.0, circuits[link.circuit]);
                let otherNode = positions.outputPositions[link.input];

                drawLinkWire(position[0], position[1], otherNode[0], otherNode[1], scale);
            }
        }

        // Draw from the selected node to the cursor
        if (selectedNodeID != null) {
            let node = selectedNodeIsInput ? inputNodes[selectedNodeID] : outputNodes[selectedNodeID];
            
            let position = [selectedNodeIsInput ? 0 : 1, node.position];

            drawLinkWire(position[0], position[1], mouseX, mouseY, scale);
        }
    }

    function drawCircuits(scale, circuits) {
        for (let id in circuits) {
            drawCircuit(scale, circuits[id]);
        }

        // Draw from the selected circuit/link to the cursor
        if (selectedCircuitID != null && selectedLinkIndex != null) {
            let circuit = circuits[selectedCircuitID];

            let positions = getLinkPositions(1.0, circuit);
            let startNode = selectedLinkIsInput ? positions.inputPositions[selectedLinkIndex] : positions.outputPositions[selectedLinkIndex];

            drawLinkWire(startNode[0], startNode[1], mouseX, mouseY, scale);
        }
    }

    function updateCircuitPosition() {
        canvasWidth = canvas.getBoundingClientRect().width;
        canvasHeight = canvas.getBoundingClientRect().height;

        if (selectedCircuitID != null && lmbDown && selectedLinkIndex == null) {
            let newPosition = [mouseX - CIRCUIT_SIZE / 2, mouseY - getCircuitHeight(circuits[selectedCircuitID]) / 2];

            if (newPosition[0] <= INPUT_NODE_POSITION || newPosition[0] + CIRCUIT_SIZE >= OUTPUT_NODE_POSITION) {
                return;
            }

            circuits[selectedCircuitID].position = newPosition;
        }
    }

    function simulateCircuit() {
        // Convert circuit to logical representation
        // TODO: BAD! Cache this, and only update on edits
        let representation = convertToLogicalRepresentation(circuits, inputNodes, outputNodes);
        
        // Read state of input nodes and write into representation's state
        let inputNodeIndex = 0;

        for (let inputNodeID in inputNodes) {
            let inputNodeValue = inputNodes[inputNodeID].state;
            let inputSlot = representation.inputSlots[inputNodeIndex];
            
            representation.state.setValue(inputSlot, inputNodeValue);

            inputNodeIndex++;
        }

        // Simulate circuit
        representation.operation(representation);

        // Read values of state to output nodes
        let outputNodeIndex = 0;

        for (let outputNodeID in outputNodes) {
            let outputSlot = representation.outputSlots[outputNodeIndex];
            let outputSlotValue = representation.state.getValue(outputSlot);

            outputNodes[outputNodeID].state = outputSlotValue;

            outputNodeIndex++;
        }
    }

    function simulationTick() {
        simulateCircuit();
    }

    function update() {
        updateCircuitPosition();
        simulateCircuit();
        draw();
    }

    function draw() {
        clearScreen();
        drawCircuits(scale, circuits);
        drawNodes(scale, inputNodes, outputNodes);
    }

    // 60 fps
    window.setInterval(update, 17);
    window.setInterval(simulationTick, 100);
});