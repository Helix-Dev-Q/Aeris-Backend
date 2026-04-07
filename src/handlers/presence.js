import express from "express";
const app = express.Router();

// Stub presence endpoints — game hits these on startup
app.get("/presence/api/v1/_/:accountId/last-online", (req, res) => res.json({}));
app.get("/presence/api/v1/_/:accountId/settings/subscriptions", (req, res) => res.json([]));
app.get("/presence/api/v1/_/:accountId/subscriptions", (req, res) => res.json([]));
app.get("/presence/api/v1/:namespace/:accountId/subscriptions/nudged", (req, res) => res.json([]));
app.get("/api/v1/Fortnite/get", (req, res) => res.json({}));

export default app;
