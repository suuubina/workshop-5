import bodyParser from "body-parser";
import express from "express";
import { BASE_NODE_PORT } from "../config";
import { Value } from "../types";

export async function node(
  nodeId: number, // the ID of the node
  N: number, // total number of nodes in the network
  F: number, // number of faulty nodes in the network
  initialValue: Value, // initial value of the node
  isFaulty: boolean, // true if the node is faulty, false otherwise
  nodesAreReady: () => boolean, // used to know if all nodes are ready to receive requests
  setNodeIsReady: (index: number) => void // this should be called when the node is started and ready to receive requests
) {
  const node = express();
  node.use(express.json());
  node.use(bodyParser.json());

  // Object to store the state of the node
  let state: Value = initialValue;

  // Route to retrieve the current status of the node
  node.get("/status", (req, res) => {
    res.json({
      nodeId,
      state
    });
  });

  // Route to receive messages from other nodes
  node.post("/message", (req, res) => {
    // Example of handling incoming messages
    const { senderId, message } = req.body;
    console.log(`Received message from Node ${senderId}: ${message}`);

    // TODO: Implement logic to handle the incoming message

    res.sendStatus(200);
  });

  // Route to start the consensus algorithm
  node.get("/start", async (req, res) => {
    // Check if all nodes are ready
    if (!nodesAreReady()) {
      res.status(400).json({ error: "Not all nodes are ready yet" });
      return;
    }

    // TODO: Implement the consensus algorithm logic here

    res.sendStatus(200);
  });

  // Route to stop the consensus algorithm
  node.get("/stop", async (req, res) => {
    // TODO: Implement logic to stop the consensus algorithm

    res.sendStatus(200);
  });

  // Route to get the current state of a node
  node.get("/getState", (req, res) => {
    res.json({
      nodeId,
      state
    });
  });

  // Start the server
  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(
      `Node ${nodeId} is listening on port ${BASE_NODE_PORT + nodeId}`
    );

    // Mark the node as ready
    setNodeIsReady(nodeId);
  });

  return server;
}
