import express from "express";
import { verifyToken } from "../database/tokens/verify.js";

const app = express.Router();

const userParty = (accountId) => ({
  current: [{
    id: `party-${accountId}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      type: "DEFAULT",
      joinability: "OPEN",
      discoverability: "ALL",
      sub_type: "default",
      max_size: 16,
      invite_ttl: 14400,
      join_confirmation: false,
    },
    members: [{
      account_id: accountId,
      meta: {},
      connections: [],
      revision: 0,
      updated_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      role: "CAPTAIN",
    }],
    applicants: [],
    meta: {},
    invites: [],
    revision: 0,
    intentions: [],
  }],
  pending: [],
  invites: [],
  pings: [],
});

app.get("/party/api/v1/Fortnite/user/:accountId", verifyToken, (req, res) => {
  res.json(userParty(req.params.accountId));
});

app.post("/party/api/v1/Fortnite/parties", verifyToken, (req, res) => {
  const accountId = req.user?.accountId || req.params.accountId;
  res.json({
    id: `party-${accountId}-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: req.body?.config || { type: "DEFAULT", joinability: "OPEN", max_size: 16 },
    members: [{
      account_id: accountId,
      meta: req.body?.meta || {},
      connections: [],
      revision: 0,
      updated_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      role: "CAPTAIN",
    }],
    applicants: [],
    meta: req.body?.party_state_overrides || {},
    invites: [],
    revision: 0,
    intentions: [],
  });
});

app.get("/party/api/v1/Fortnite/parties/:partyId", verifyToken, (req, res) => {
  res.json({ id: req.params.partyId, members: [], invites: [], revision: 0 });
});

app.patch("/party/api/v1/Fortnite/parties/:partyId", verifyToken, (req, res) => {
  res.json({});
});

app.post("/party/api/v1/Fortnite/parties/:partyId/members/:accountId/join", verifyToken, (req, res) => {
  res.json({ status: "JOINED", party_id: req.params.partyId });
});

app.delete("/party/api/v1/Fortnite/parties/:partyId/members/:accountId", verifyToken, (req, res) => {
  res.status(204).send();
});

app.post("/party/api/v1/Fortnite/parties/:partyId/invites/:accountId", verifyToken, (req, res) => {
  res.json({});
});

app.delete("/party/api/v1/Fortnite/parties/:partyId/invites/:accountId", verifyToken, (req, res) => {
  res.status(204).send();
});

app.patch("/party/api/v1/Fortnite/parties/:partyId/members/:accountId/meta", verifyToken, (req, res) => {
  res.json({});
});

app.post("/party/api/v1/Fortnite/user/:accountId/pings/:pingerId", verifyToken, (req, res) => {
  res.json({});
});

app.delete("/party/api/v1/Fortnite/user/:accountId/pings/:pingerId", verifyToken, (req, res) => {
  res.status(204).send();
});

export default app;

app.get("/party/api/v1/Fortnite/user/:accountId/notifications/undelivered/count", verifyToken, (req, res) => {
  res.json({ count: 0 });
});
