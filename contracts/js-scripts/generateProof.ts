import { Noir } from "@noir-lang/noir_js";
import { ethers } from "ethers";
import { UltraHonkBackend } from "@aztec/bb.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";


// get the circuit file
const circuitPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../circuits/target/zk_panagram.json");
const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

export default async function generateProof() {
    // Derive absolute path and parse circuit JSON
    const circuitPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../circuits/target/zk_panagram.json"
    );
    const circuitFileContent = fs.readFileSync(circuitPath, "utf8");
    const circuitData = JSON.parse(circuitFileContent); // Renamed to avoid conflict

    // Retrieve command-line arguments, skipping 'node' and script path 
    const inputsArray = process.argv.slice(2);

    try {
        // 1. Initialize Noir with the circuit definition
        const noir = new Noir(circuitData); // Use the parsed JSON object
        await noir.init();

        // 2. Initialize the backend (e.g., UltraHonkBackend) with the circuit bytecode
        // The { threads: 1 } option configures the backend for single-threaded operation.
        const backend = new UltraHonkBackend(circuitData.bytecode, { threads: 1 });

        // 3. Prepare the inputs for the circuit
        // This structure must match the InputMap defined in your Noir circuit (Nargo.toml or main.nr)
        // Example: Taking inputs from command-line arguments
        const inputs = {
            guess_hash: inputsArray[0],  // First CLI argument
            answer_double_hash: inputsArray[1], // Second CLI argument
            address: inputsArray[2]// Add other inputs as required by your circuit
        };

        // 4. Execute the circuit with the inputs to generate the witness
        // noir.execute returns an object { witness, returnValue }
        const { witness } = await noir.execute(inputs);

        // 5. Temporarily suppress console.log from the backend during proof generation
        // Some backends might produce verbose logs. This ensures clean output for FFI.
        const originalLog = console.log;
        console.log = () => { }; // Override with an empty function

        // 6. Generate the proof using the backend and the witness
        // The { keccak: true } option may be required if your verifier contract uses Keccak.
        const { proof } = await backend.generateProof(witness, { keccak: true });

        // 7. Restore the original console.log function
        console.log = originalLog;

        // 8. ABI encode the proof for smart contract consumption
        // The proof (typically a Uint8Array) needs to be encoded as 'bytes' (a hex string).
        const proofEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes"], // The Solidity type to encode as
            [proof]    // The value to encode (must be wrapped in an array)
        );

        return proofEncoded;

    } catch (error) {
        // Log the error for debugging
        console.error("Error during proof generation:", error);
        // Re-throw the error to be caught by the calling IIFE, signaling failure
        throw error;
    }
}

// (IIFE (Immediately Invoked Function Expression ) at the end of generateProof.ts)
(async () => {
    try {
        const proof = await generateProof();
        // Write the ABI-encoded proof to standard output for FFI consumption
        // process.stdout.write ensures no extra formatting (like newlines from console.log)
        process.stdout.write(proof);
        // Exit with code 0 to indicate successful execution
        process.exit(0);
    } catch (error) {
        // Error is already logged within generateProof, but we can log a generic message here too.
        // console.error("Script execution failed."); // Redundant if generateProof logs
        // Exit with code 1 to indicate failure
        process.exit(1);
    }

})();//this two parentheses are needed to call the function immediately