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

const AND_GATE = {
    "operation": (state, inputs) => { return [state.getValue(inputs[0]) * state.getValue(inputs[1])]; },
    "inputs": [],
    "outputs": []
};

const OR_GATE = {
    "operation": (state, inputs) => { return [state.getValue(inputs[0]) + state.getValue(inputs[1])]; },
    "inputs": [],
    "outputs": []
};

const NOT_GATE = {
    "operation": (state, inputs) => { return [state.getValue(inputs[0]) ? 0 : 1]; },
    "inputs": [],
    "outputs": []
};

const CIRCUIT_REPRESENTATION = {
    "name": "",
    "state": undefined,
    "inputs": [],
    "outputs": [],
    "circuits": [] // List of circuits in execution order
}

function executeGate(state, gate) {
    let resultValues = gate.operation(state, gate.inputs);

    for (let i = 0; i < gate.outputs.length; i++) {
        state.setValue(gate.outputs[i], resultValues[i] % 2);
    }
}

function bindGates(state, inputGate, outputGate, inputIndex, outputIndex, slot = -1) {
    slot = slot == -1 ? state.allocate() : slot;

    outputGate.inputs[outputIndex] = slot;
    inputGate.outputs[inputIndex] = slot;
}

function allocateGate(prototype, lengthIn, lengthOut) {
    // Shallow copy is adequate
    let instance = Object.assign({}, prototype);

    instance.inputs = Array(lengthIn).fill(undefined);
    instance.outputs = Array(lengthOut).fill(undefined);

    return instance;
}

function allocateCircuit(state) {
    let instance = JSON.parse(JSON.stringify(CIRCUIT_REPRESENTATION));

    // Get minimal representation of state
    let array = Array(state.currentIndex);

    for (let i = 0; i < state.currentIndex; i++) {
        array[i] = state.memory[i];
    }

    instance.state = new State(state.currentIndex);
    instance.state.memory = array;
    instance.state.currentIndex = state.currentIndex;

    return instance;
}

function simulateCircuit(circuit, inputs) {
    // Read input array, and set them in the circuit
    for (let i = 0; i < inputs.length; i++) {
        circuit.state.setValue(circuit.inputs[i], inputs[i]);
    }

    // Execute each gate in circuit
    for (let i = 0; i < circuit.circuits.length; i++) {
        executeGate(circuit.state, circuit.circuits[i]);
    }

    let outputs = Array(circuit.outputs.length);

    // Read outputs
    for (let i = 0; i < circuit.outputs.length; i++) {
        outputs[i] = circuit.state.getValue(circuit.outputs[i]);
    }

    return outputs;
}

function exampleSimulation() {
    let s = new State(1024);

    // Get input slots
    let inputA = s.allocate();
    let inputB = s.allocate();

    let output = s.allocate();

    // Create gates
    let or_gate = allocateGate(OR_GATE, 2, 1);
    let and_gate_0 = allocateGate(AND_GATE, 2, 1);
    let and_gate_1 = allocateGate(AND_GATE, 2, 1);
    let not_gate = allocateGate(NOT_GATE, 1, 1);

    or_gate.inputs = [inputA, inputB];
    and_gate_0.inputs = [inputA, inputB];
    and_gate_1.outputs = [output];

    bindGates(s, or_gate, and_gate_1, 0, 0);
    bindGates(s, and_gate_0, not_gate, 0, 0);
    bindGates(s, not_gate, and_gate_1, 0, 1);

    let XOR_CIRCUIT = allocateCircuit(s);
    XOR_CIRCUIT.circuits = [or_gate, and_gate_0, not_gate, and_gate_1];
    XOR_CIRCUIT.inputs = [inputA, inputB];
    XOR_CIRCUIT.outputs = [output];

    let v01 = simulateCircuit(XOR_CIRCUIT, [0, 1])[0];
    let v10 = simulateCircuit(XOR_CIRCUIT, [1, 0])[0];
    let v11 = simulateCircuit(XOR_CIRCUIT, [1, 1])[0];
    let v00 = simulateCircuit(XOR_CIRCUIT, [0, 0])[0];

    console.log(v01, v10, v11, v00);
}

exampleSimulation();