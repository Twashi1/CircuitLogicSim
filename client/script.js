// https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file

// TODO: delete/move input/output nodes
// TODO: right click/long press functionality
// TODO: add labels to gate links
// TODO: recursive circuits
// TODO: gates should be brighter
// TODO: should use some sort of map type instead of treating an object as a map
// TODO: use bootstrap

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

const SELECTION_STRUCTURE = {
    "circuitID": null,
    "linkIndex": null,
    "nodeID": null,
    "isInput": null
};

// TODO: these values probably have a standard, find it and use it
// Default long press is 500ms, I'm using a shorter time because its faster
const LONG_PRESS_MINIMUM_ELAPSED = 0.2;
const DOUBLE_TAP_MAXIMUM_ELAPSED = 0.3;

const DRAG_DISTANCE_MINIMUM = 0.05;
const DRAG_ELAPSED_MINIMUM = 0;

let mouseX = 0;
let mouseY = 0;

let tapBeginMouseX = 0;
let tapBeginMouseY = 0;
let tapBeginTimestamp = null;
let lastTapTimestamp = null;

let previousSelection = Object.assign({}, SELECTION_STRUCTURE);

let canvasWidth = 0;
let canvasHeight = 0;
let canvasRect = null;

const CIRCUIT_SIZE = 0.08;

const NODE_SIZE = 0.02;
const NODE_BORDER_WIDTH = 0.1;
const NODE_RADIUS = (NODE_SIZE + NODE_SIZE * NODE_BORDER_WIDTH) / 2;
const NODE_PADDING = 0.01;

const LINK_SIZE = 0.01;
const LINK_BORDER_WIDTH = 0.2;
const LINK_RADIUS = (LINK_SIZE + LINK_SIZE * LINK_BORDER_WIDTH) / 2;

const WIRE_WIDTH = 0.005;

const CIRCUIT_TEXT_SCALE = 1.5;
const LABEL_TEXT_SCALE = 1;
const NODE_TEXT_SCALE = 1;

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

function scaleCoordinates(x, y) {
    return [(x - canvasRect.left) / canvasWidth, (y - canvasRect.top) / canvasHeight];
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

function getSelectedLinkIndex(x, y, linkPositions, isInput, circuitID) {
    for (let i = 0; i < linkPositions.length; i++) {
        let position = linkPositions[i];

        // Check if cursor overlaps input position
        if (circleContains(position[0], position[1], LINK_RADIUS * scale, x, y)) {
            let selection = Object.assign({}, SELECTION_STRUCTURE);

            selection.circuitID = circuitID;
            selection.linkIndex = i;
            selection.isInput = isInput;

            return selection;
        }
    }

    return null;
}

function getSelectedNode(x, y, nodes, isInput) {
    for (let nodeID in nodes) {
        let node = nodes[nodeID];

        if (Math.abs(node.position - y) <= NODE_RADIUS * 2 * scale) {
            let selection = Object.assign({}, SELECTION_STRUCTURE);

            selection.nodeID = nodeID;
            selection.isInput = isInput;

            return selection;
        }
    }

    return null;
}

function getSelectedCircuit(x, y, circuit, circuitID) {
    // Check if the circuit itself was selected
    let circuitHalfWidth = getCircuitWidth(circuit) / 2;
    let circuitHalfHeight = getCircuitHeight(circuit) / 2;

    if (aabbContains(
        circuit.position[0] - circuitHalfWidth,
        circuit.position[0] + circuitHalfWidth,
        circuit.position[1] - circuitHalfHeight,
        circuit.position[1] + circuitHalfHeight,
        x,
        y
    )) {
        let selection = Object.assign({}, SELECTION_STRUCTURE);

        selection.circuitID = circuitID;

        return selection;
    }

    return null;
}

function getSelected(x, y) {
    let selection = null;

    // Iterate circuits
    for (let circuitID in circuits) {
        let circuit = circuits[circuitID];

        // Check if one of the links of the circuit was selected
        let inputPositions = getLinkPositions(circuit, true);
        let outputPositions = getLinkPositions(circuit, false);

        selection = getSelectedLinkIndex(x, y, inputPositions, true, circuitID);

        if (selection != null) return selection;
        
        selection = getSelectedLinkIndex(x, y, outputPositions, false, circuitID);
    
        if (selection != null) return selection;

        selection = getSelectedCircuit(x, y, circuit, circuitID);

        if (selection != null) return selection;
    }

    // Check if an input/output node was selected
    if (x < getNodeRegionWidth()) {
        selection = getSelectedNode(x, y, inputNodes, true);

        if (selection != null) return selection;
    } else if (x > (1 - getNodeRegionWidth())) {
        selection = getSelectedNode(x, y, outputNodes, false);

        if (selection != null) return selection;
    }

    return Object.assign({}, SELECTION_STRUCTURE);
}

function addInputNodeLink(nodeID, circuitID, linkIndex) {
    if (checkCircuitInputLinkAlreadySet(circuitID, linkIndex)) return;

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

function checkOverlappingNode(y, nodes) {
    for (let nodeID in nodes) {
        let node = nodes[nodeID];

        if (Math.abs(node.position - y) <= (NODE_RADIUS * 2 + NODE_PADDING) * scale) {
            return true;
        }
    }

    return false;
}

function spawnInputNode(y) {
    if (checkOverlappingNode(y, inputNodes)) return;

    let newID = generateID(inputNodes);

    inputNodes[newID] = {
        "state": false,
        "links": [],
        "position": y
    };
}

function spawnOutputNode(y) {
    if (checkOverlappingNode(y, outputNodes)) return;

    let newID = generateID(outputNodes);

    outputNodes[newID] = {
        "state": false,
        "links": [],
        "position": y
    };
}

function clearLink(outputCircuitID, outputIndex) {
    for (let circuitID in circuits) {
        if (circuitID == outputCircuitID) continue;

        let circuit = circuits[circuitID];

        circuit.links = circuit.links.filter(link => link.circuit != outputCircuitID || link.output != outputIndex);
    }

    // Check that the link is not coming from an input node
    for (let inputNodeID in inputNodes) {
        let inputNode = inputNodes[inputNodeID];

        inputNode.links = inputNode.links.filter(link => link.circuit != outputCircuitID || link.output != outputIndex);
    }

    circuitChanged = true;
}

function checkCircuitInputLinkAlreadySet(outputCircuitID, outputIndex) {
    // Look if a different circuit links to it
    for (let circuitID in circuits) {
        let circuit = circuits[circuitID];

        for (let linkIndex = 0; linkIndex < circuit.links.length; linkIndex++) {
            let link = circuit.links[linkIndex];

            if (link.circuit == outputCircuitID && link.output == outputIndex)
                return true;
        }
    }

    // Look if an input circuit links to it
    for (let inputNodeID in inputNodes) {
        let inputNode = inputNodes[inputNodeID];

        for (let linkIndex = 0; linkIndex < inputNode.links.length; linkIndex++) {
            let link = inputNode.links[linkIndex];

            if (link.circuit == outputCircuitID && link.output == outputIndex)
                return true;
        }
    }

    return false;
}

function addLink(inputCircuitID, inputIndex, outputCircuitID, outputIndex) {
    if (checkCircuitInputLinkAlreadySet(outputCircuitID, outputIndex)) return;

    let inputCircuit = circuits[inputCircuitID];

    inputCircuit.links.push({
        "circuit": outputCircuitID,
        "input": inputIndex,
        "output": outputIndex
    });

    circuitChanged = true;
}

function clearOutputNode(outputNodeID) {
    outputNodes[outputNodeID].links = [];

    circuitChanged = true;
}

function isSameSelection(a, b) {
    return a.circuitID == b.circuitID && a.isInput == b.isInput && a.nodeID == b.nodeID && a.linkIndex == b.linkIndex;
}

function distance(x0, y0, x1, y1) {
    let dx = x1 - x0;
    let dy = y1 - y0;

    return Math.sqrt(dx * dx + dy * dy);
}

function dragAction(x, y) {
    let currentSelection = getSelected(x, y);

    // If a circuit is selected (not a link of the circuit), and previous selection was also a circuit (preventing us from moving circuit when we're making links), move to cursor position
    if (currentSelection.circuitID != null && currentSelection.linkIndex == null && previousSelection.linkIndex == null && previousSelection.circuitID == currentSelection.circuitID) {
        let circuit = circuits[currentSelection.circuitID];
        let circuitHalfWidth = getCircuitWidth(circuit) / 2;
        let circuitHalfHeight = getCircuitHeight(circuit) / 2;

        if (x - circuitHalfWidth >= getNodeRegionWidth() && x + circuitHalfWidth <= (1 - getNodeRegionWidth()) && y - circuitHalfHeight >= 0 && y + circuitHalfHeight <= 1) {
            circuit.position = [x, y];   
        }
    }
}

function drawWiresToCursor() {
    // If a link was previously selected, draw wire to it
    if (previousSelection.linkIndex != null) {
        let linkPosition = getLinkPositions(circuits[previousSelection.circuitID], previousSelection.isInput)[previousSelection.linkIndex];

        drawWire(linkPosition[0], linkPosition[1], mouseX, mouseY);
    }
    // If a node was previously selected, draw wire to it
    else if (previousSelection.nodeID != null) {
        drawWire(getNodeX(previousSelection.isInput), (previousSelection.isInput ? inputNodes : outputNodes)[previousSelection.nodeID].position, mouseX, mouseY);
    }
}

function tapAction(x, y) {
    let currentSelection = getSelected(x, y);

    // Create I/O node when clicking sidebar
    if (currentSelection.nodeID == null) {
        if (x < getNodeRegionWidth()) {
            spawnInputNode(y);
        } else if (x > (1 - getNodeRegionWidth())) {
            spawnOutputNode(y);
        }
    }

    // If clicked same element
    if (isSameSelection(currentSelection, previousSelection)) {
        // If they tapped on an input link, clear it
        if (currentSelection.linkIndex != null && currentSelection.isInput) {
            clearLink(currentSelection.circuitID, currentSelection.linkIndex);
        }
        // If they tapped on a node
        else if (currentSelection.nodeID != null) {
            // If they tapped on an input node, switch its state
            if (currentSelection.isInput)
                inputNodes[currentSelection.nodeID].state = !inputNodes[currentSelection.nodeID].state;
            // If they tapped on an output node, clear it
            else
                clearOutputNode(currentSelection.nodeID);
        }
    } else {
        // If they previously selected a node, and currently are selecting a link
        // Create link for input or output node
        if (previousSelection.nodeID != null && currentSelection.linkIndex != null) {
            // Check that the type of node and type of link are same
            if (previousSelection.isInput == currentSelection.isInput) {
                if (previousSelection.isInput)
                    addInputNodeLink(previousSelection.nodeID, currentSelection.circuitID, currentSelection.linkIndex)
                else 
                    addOutputNodeLink(previousSelection.nodeID, currentSelection.circuitID, currentSelection.linkIndex);
            }
        }
        // If they previously selected a link, and currently are selecting a node
        // Create link for an input or output node
        else if (previousSelection.linkIndex != null && currentSelection.nodeID != null) {
            // Check that the type of node and type of link are same
            if (previousSelection.isInput == currentSelection.isInput) {
                if (currentSelection.isInput)
                    addInputNodeLink(currentSelection.nodeID, previousSelection.circuitID, previousSelection.linkIndex)
                else 
                    addOutputNodeLink(currentSelection.nodeID, previousSelection.circuitID, previousSelection.linkIndex);
            }
        }
        // If they previously selected a link, and currently are selecting a link
        // Create link between two circuits
        else if (previousSelection.linkIndex != null && currentSelection.linkIndex != null) {
            // Check that the type of links are opposite
            if (previousSelection.isInput === true && currentSelection.isInput === false)
                addLink(currentSelection.circuitID, currentSelection.linkIndex, previousSelection.circuitID, previousSelection.linkIndex);
            else if (currentSelection.isInput === true && previousSelection.isInput === false)
                addLink(previousSelection.circuitID, previousSelection.linkIndex, currentSelection.circuitID, currentSelection.linkIndex);
        }
    }
}

function deleteCircuit(circuitID) {
    // State before
    let circuit = circuits[circuitID];

    // Look for all links and delete them
    for (let inputIndex = 0; inputIndex < circuit.inputLabels.length; inputIndex++) {
        clearLink(circuitID, inputIndex);
    }

    // Delete output node links
    for (let nodeID in outputNodes) {
        let outputNode = outputNodes[nodeID];

        for (let i = 0; i < outputNode.links.length; i++) {
            let link = outputNode.links[i];

            if (link.circuit == circuitID) {
                outputNode.links = [];

                break;
            }
        }
    }

    // Delete the circuit
    delete circuits[circuitID];

    circuitChanged = true;
}

// Also activated by right click on PC
// TODO: on PC, a long press action should not be invoked if the position of the object changed significantly
function longPressAction(x, y) {
    let currentSelection = getSelected(x, y);

    console.log("Long press!");
}

function doubleTapAction(x, y) {
    let currentSelection = getSelected(x, y);

    // If double tapped on a circuit or link of circuit
    if (currentSelection.circuitID != null) {
        // If double tapped on circuit itself
        if (previousSelection.circuitID == currentSelection.circuitID && currentSelection.linkIndex == null) {
            deleteCircuit(currentSelection.circuitID);
        }
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
function mobileTouchStart(event) {
    event.preventDefault();

    const touches = event.changedTouches;

    // We only care about 1 touch anyway
    if (touches.length > 0) {    
        let cursorPosition = scaleCoordinates(event.clientX, event.clientY);
        tapBeginMouseX = cursorPosition[0];
        tapBeginMouseY = cursorPosition[1];

        tapBeginTimestamp = new Date();

        previousSelection = getSelected(tapBeginMouseX, tapBeginMouseY);
    }
}

function mobileTouchEnd(event) {
    event.preventDefault();

    const touches = event.changedTouches;

    if (touches.length > 0 && tapBeginTimestamp != null) {
        let cursorPosition = scaleCoordinates(touches[0].clientX, touches[0].clientY);

        invokeAppropriateAction(cursorPosition[0], cursorPosition[1]);
    }

    previousSelection = Object.assign({}, SELECTION_STRUCTURE);
    tapBeginTimestamp = null;
}

function invokeAppropriateAction(x, y) {
    let currentTimestamp = new Date();
    let touchTimeElapsed = (currentTimestamp - tapBeginTimestamp) / 1000;
    let timeSinceLastTap = null;

    if (lastTapTimestamp != null)
        timeSinceLastTap = (currentTimestamp - lastTapTimestamp) / 1000;

    if (!isDragging() && touchTimeElapsed > LONG_PRESS_MINIMUM_ELAPSED) {
        longPressAction(x, y);
    } else if (!isDragging() && timeSinceLastTap != null && timeSinceLastTap < DOUBLE_TAP_MAXIMUM_ELAPSED) {
        doubleTapAction(x, y);
    } else {
        tapAction(x, y);

        lastTapTimestamp = currentTimestamp;
    }
}

function isDragging() {
    // Indicates mouse is currently down
    if (tapBeginTimestamp != null) {
        let timeElapsedHeld = ((new Date()) - tapBeginTimestamp) / 1000;
        let distanceTravelled = distance(tapBeginMouseX, tapBeginMouseY, mouseX, mouseY);

        if (timeElapsedHeld >= DRAG_ELAPSED_MINIMUM && distanceTravelled >= DRAG_DISTANCE_MINIMUM * scale) {
            return true;
        }
    }

    return false;
}

function mobileTouchMove(event) {
    event.preventDefault();

    let cursorPosition = scaleCoordinates(event.clientX, event.clientY);
    mouseX = cursorPosition[0];
    mouseY = cursorPosition[1];

    dragAction(mouseX, mouseY);
}

function computerMouseDown(event) {
    let cursorPosition;

    if (event.button == 0 || event.button == 1) {
        cursorPosition = scaleCoordinates(event.clientX, event.clientY);
    }

    if (event.button == 0) {
        tapBeginMouseX = cursorPosition[0];
        tapBeginMouseY = cursorPosition[1];

        tapBeginTimestamp = new Date();
    
        previousSelection = getSelected(tapBeginMouseX, tapBeginMouseY);
    }
}

function computerMouseUp(event) {
    let cursorPosition;

    if (tapBeginTimestamp == null) return;
    
    if (event.button == 0 || event.button == 1) {
        cursorPosition = scaleCoordinates(event.clientX, event.clientY);
    }

    if (event.button == 0) {
        invokeAppropriateAction(cursorPosition[0], cursorPosition[1]);
    }

    if (event.button == 1) {
        longPressAction(cursorPosition[0], cursorPosition[1]);
    }

    previousSelection = Object.assign({}, SELECTION_STRUCTURE);
    tapBeginTimestamp = null;
}

function computerMouseMove(event) {
    let cursorPosition = scaleCoordinates(event.clientX, event.clientY);
    mouseX = cursorPosition[0];
    mouseY = cursorPosition[1];

    dragAction(mouseX, mouseY);
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

                spawnCircuit(GATE_TYPE_AND, inputs, outputs, null, "AND");
            }; break;
            case GATE_TYPE_OR: onclickFunction = () => {
                let inputs = new Array(2);
                inputs[0] = "A";
                inputs[1] = "B";
                let outputs = new Array(1);
                outputs[0] = "C";

                spawnCircuit(GATE_TYPE_OR, inputs, outputs, null, "OR");
            }; break;
            case GATE_TYPE_NOT: onclickFunction = () => {
                let inputs = new Array(1);
                inputs[0] = "A";
                let outputs = new Array(1);
                outputs[0] = "B";

                spawnCircuit(GATE_TYPE_NOT, inputs, outputs, null, "NOT");
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

function multiplyColor(color, amount) {
    let r = (Math.min(Math.floor(parseInt(color.slice(1, 3), 16) * amount), 255)).toString(16);
    let g = (Math.min(Math.floor(parseInt(color.slice(3, 5), 16) * amount), 255)).toString(16);
    let b = (Math.min(Math.floor(parseInt(color.slice(5, 7), 16) * amount), 255)).toString(16);

    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;

    return `#${r}${g}${b}`;
}

function spawnCircuit(type, inputLabels, outputLabels, representation, name) {
    circuits[generateID(circuits)] = {
        "name": name,
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

function roundDigits(number, digits) {
    return Math.round((number + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits);
}

function changeScaleSliderValue() {
    let sliderValue = document.getElementById("circuitScaleInput").value / 100;
    scale = scaleRange(sliderValue, SCALE_MINIMUM, SCALE_MAXIMUM);

    // https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary
    document.getElementById("circuitScaleValue").innerHTML = `${roundDigits(scale * 100, 3)}%`;
}

let canvas;
let ctx;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("circuitButton").addEventListener("click", getCircuitButtonClick);
    document.getElementById("saveCircuitButton").addEventListener("click", saveCircuitButtonClick);
    document.getElementById("circuitScaleInput").addEventListener("input", changeScaleSliderValue);

    document.getElementById("circuitScaleInput").value = ((1.0 - SCALE_MINIMUM) / (SCALE_MAXIMUM - SCALE_MINIMUM)) * 100;

    addInitialPaletteButtons();

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    canvas.addEventListener("mousedown", computerMouseDown);
    canvas.addEventListener("mouseup", computerMouseUp);
    canvas.addEventListener("mousemove", computerMouseMove);
    canvas.addEventListener("touchstart", mobileTouchStart);
    canvas.addEventListener("touchend", mobileTouchEnd);
    canvas.addEventListener("touchmove", mobileTouchMove);

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
        // Fit to container div
        // https://stackoverflow.com/questions/10214873/make-canvas-as-wide-and-as-high-as-parent#:~:text=If%20you%20want%20the%20canvas,display%20size%20of%20the%20canvas.
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        ctx.font = `${CIRCUIT_TEXT_SCALE * scale}vw Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = 'middle';

        let canvasBorderDiv = document.getElementById("canvasBorder");
        let rect = canvasBorderDiv.getBoundingClientRect();

        canvasWidth = canvasBorderDiv.offsetWidth;
        canvasHeight = canvasBorderDiv.offsetHeight;
        canvasRect = rect;

        draw();
    }

    function draw() {
        clearScreen();
        drawWiresToCursor();
        drawCircuits(circuits);
        drawNodes(inputNodes, outputNodes);
    }

    window.setInterval(update, FPS_RATE);
    window.setInterval(simulationTick, SIMULATION_RATE);
});

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
    let x = circuit.position[0];
    let y = circuit.position[1];

    let width = getCircuitWidth(circuit);
    let height = getCircuitHeight(circuit);

    let left = x - width / 2;
    let bottom = y - width / 2;

    // Iterate links and draw them
    let inputPositions = getLinkPositions(circuit, true);
    let outputPositions = getLinkPositions(circuit, false);

    // Draw wires
    for (let i = 0; i < circuit.links.length; i++) {
        let link = circuit.links[i];

        let otherCircuit = circuits[link.circuit];
        let otherCircuitInputPositions = getLinkPositions(otherCircuit, true);

        let ourNode = outputPositions[link.input];
        let otherNode = otherCircuitInputPositions[link.output];

        drawWire(ourNode[0], ourNode[1], otherNode[0], otherNode[1]);
    }

    ctx.fillStyle = circuit.color;
    ctx.fillRect(left * canvasWidth, bottom * canvasHeight, width * canvasWidth, height * canvasHeight);

    ctx.fillStyle = multiplyColor(circuit.color, 0.5);
    ctx.fillText(circuit.name, x * canvasWidth, y * canvasHeight);

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
}

function drawCircuits(circuits) {
    for (let id in circuits) {
        drawCircuit(circuits[id]);
    }
}