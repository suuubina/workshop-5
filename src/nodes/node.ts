import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { BASE_NODE_PORT } from "../config";
import { Value, NodeState} from "../types";
import { delay } from "../utils";

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

  let nodeState: NodeState = {
    killed: isFaulty,
    x: isFaulty ? null : initialValue,
    decided: isFaulty ? null : false,
    k: isFaulty ? null : 0,
  };

  // TODO implement this
  // this route allows retrieving the current status of the node
  // node.get("/status", (req, res) => {});
  node.get("/status", (req, res) => {
    if (isFaulty === true) {
      res.status(500).send("faulty");
    } else {
      res.status(200).send("live");
    }
  });

  // TODO implement this
  // this route allows the node to receive messages from other nodes
  // node.post("/message", (req, res) => {});
  let proposals: Map<number, Value[]> = new Map();
  let votes: Map<number, Value[]> = new Map();

  node.post("/message", async (req: Request<any, any, any, any>, res: Response<any>) => {
      let { k, x, messageType } = req.body;
      if (!nodeState.killed && !isFaulty) {
        if (messageType == "P") {
          if (!proposals.has(k)) proposals.set(k, []);
          proposals.get(k)!.push(x);
          const proposalList = proposals.get(k);
          if (proposalList && proposalList.length >= N - F) {
            const countNo = proposalList.filter((x) => x == 0).length;
            const countYes = proposalList.filter((x) => x == 1).length;
            let decisionValue =
              countNo > N / 2 ? 0 : countYes > N / 2 ? 1 : "?";
            for (let i = 0; i < N; i++) {
              fetch(`http://localhost:${BASE_NODE_PORT + i}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ k, x: decisionValue, messageType: "V" }),
              });
            }
          }
        } else if (messageType == "V") {
          if (!votes.has(k)) votes.set(k, []);
          votes.get(k)!.push(x);
          const voteList = votes.get(k);
          if (voteList && voteList.length >= N - F) {
            const countNo = voteList.filter((x) => x == 0).length;
            const countYes = voteList.filter((x) => x == 1).length;
            if (countNo >= F + 1) {
              nodeState.x = 0;
              nodeState.decided = true;
            } else if (countYes >= F + 1) {
              nodeState.x = 1;
              nodeState.decided = true;
            } else {
              nodeState.x =
                countNo + countYes > 0 && countNo > countYes
                  ? 0
                  : countNo + countYes > 0 && countNo < countYes
                  ? 1
                  : Math.random() > 0.5
                  ? 0
                  : 1;
              if (nodeState.k != null) nodeState.k += 1;
              for (let i = 0; i < N; i++) {
                fetch(`http://localhost:${BASE_NODE_PORT + i}/message`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    k: nodeState.k,
                    x: nodeState.x,
                    messageType: "P",
                  }),
                });
              }
            }
          }
        }
      }
      res.status(200).send("success");
    }
  );

  // TODO implement this
  // this route is used to start the consensus algorithm
  // node.get("/start", async (req, res) => {});
  node.get("/start", async (req, res) => {
    // Wait until all nodes are ready
    while (!nodesAreReady()) {
      await delay(100);
    }

    if (!isFaulty) {
      // Initialize the node state
      nodeState.k = 1;
      nodeState.x = initialValue;
      nodeState.decided = false;

      // Send a proposal message to all nodes
      for (let i = 0; i < N; i++) {
        fetch(`http://localhost:${3000 + i}/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            k: nodeState.k,
            x: nodeState.x,
            messageType: "P", // P for proposal
          }),
        });
      }
    } else {
      // If the node is faulty, initialize the state accordingly
      nodeState.decided = null;
      nodeState.x = null;
      nodeState.k = null;
    }
    res.status(200).send("started");
  });
  

  // TODO implement this
  // this route is used to stop the consensus algorithm
  // node.get("/stop", async (req, res) => {});
  node.get("/stop", async (req, res) => {
    nodeState.killed = true;
    res.status(200).send("killed");
  });

  // TODO implement this
  // get the current state of a node
  // node.get("/getState", (req, res) => {});
  node.get("/getState", (req, res) => {
    if (isFaulty) {
      res.send({
        killed: nodeState.killed,
        decided: null,
        x: null,
        k: null,
      });
    } else {
      res.send(nodeState);
    }
  });

  
  
  // start the server
  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(
      `Node ${nodeId} is listening on port ${BASE_NODE_PORT + nodeId}`
    );

    // the node is ready
    setNodeIsReady(nodeId);
  });

  return server;
}