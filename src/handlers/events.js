import express from "express";
import fs from "fs";
import mongoose from 'mongoose';
import Utils from "../core/helpers.js";
import log from "../core/logger.js";
import path from "path";
import { dirname } from 'dirname-filename-esm';
import { verifyToken } from "../database/tokens/verify.js";
import dotenv from "dotenv";
dotenv.config();

const __dirname = dirname(import.meta);
const app = express.Router();

const userSchema = new mongoose.Schema({
    username: String,
    accountId: String,
    tournamentDetails: 
    {
        kills: { type: Number, default: 0 },
        placement: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        matchesPlayed: { type: Number, default: 0 },
        matches: { type: Array, default: [] },
        played: { type: Boolean, default: false }
    }
});

const profileSchema = new mongoose.Schema({
    accountId: String,
    profiles: {
        athena: {
            stats: {
                attributes: {
                    arena_hype: { type: Number, default: 0 }
                }
            }
        }
    }
});

const User = mongoose.models['users'] || mongoose.model('users', userSchema);
const Profile = mongoose.models['profiles'] || mongoose.model('profiles', profileSchema);

async function GetPlayerHype(accountid) {
    try {
        const profile = await Profile.findOne({ accountId: accountid }).lean();
        if (profile?.profiles?.athena?.stats?.attributes) {
            return profile.profiles.athena.stats.attributes.arena_hype || 0;
        }
        return 0;
    } catch (error) {
        console.error(`Error fetching player hype: ${error}`);
        return 0;
    }
}

app.get("/api/v1/events/Fortnite/download/:accountid", verifyToken, async (req, res) => {
    const seasonNum = Utils.GetVersion(req).season;
    const accountid = req.params.accountid;
    const user = await User.findOne({ accountId: accountid });

    if (!user) {
        return res.status(404).json({ error: "No user found" });
    }

    const username = user.username;
    const arena = path.join(__dirname, `../data/events/Events.json`);
    let currentSeason = "S" + seasonNum;

    let playerHype;
    try {
        playerHype = await GetPlayerHype(accountid);
    }
    catch (err) {
        log.error("Error getting player hype! Error :", err);
        return res.status(500).send('Internal server error');
    }

    let playerDivision = `"LG_ARENA_${currentSeason}_Division1"`;

    if (playerHype >= 16000) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4", "LG_ARENA_${currentSeason}_Division5", "LG_ARENA_${currentSeason}_Division6", "LG_ARENA_${currentSeason}_Division7", "LG_ARENA_${currentSeason}_Division8", "LG_ARENA_${currentSeason}_Division9", "LG_ARENA_${currentSeason}_Division10"`;
    } else if (playerHype >= 12000) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4", "LG_ARENA_${currentSeason}_Division5", "LG_ARENA_${currentSeason}_Division6", "LG_ARENA_${currentSeason}_Division7", "LG_ARENA_${currentSeason}_Division8", "LG_ARENA_${currentSeason}_Division9"`;
    } else if (playerHype >= 6000) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4", "LG_ARENA_${currentSeason}_Division5", "LG_ARENA_${currentSeason}_Division6", "LG_ARENA_${currentSeason}_Division7", "LG_ARENA_${currentSeason}_Division8"`;
    } else if (playerHype >= 4000) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4", "LG_ARENA_${currentSeason}_Division5", "LG_ARENA_${currentSeason}_Division6", "LG_ARENA_${currentSeason}_Division7"`;
    } else if (playerHype >= 2500) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4", "LG_ARENA_${currentSeason}_Division5", "LG_ARENA_${currentSeason}_Division6"`;
    } else if (playerHype >= 1500) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4", "LG_ARENA_${currentSeason}_Division5"`;
    } else if (playerHype >= 1000) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3", "LG_ARENA_${currentSeason}_Division4"`;
    } else if (playerHype >= 500) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2", "LG_ARENA_${currentSeason}_Division3"`;
    } else if (playerHype >= 250) {
        playerDivision = `"LG_ARENA_${currentSeason}_Division1", "LG_ARENA_${currentSeason}_Division2"`;
    }

    fs.readFile(arena, 'utf-8', (err, data) => {
        if (err) {
            log.error("Error reading file:", err);
            res.status(500).send('Error reading file!!!');
            return;
        }

        let modifiedData = data.replace(/skunkyskunkyhype/g, playerHype)
            .replace(/skunkyskunkyseason/g, currentSeason)
            .replace(/skunkyskunkyaccountid/g, accountid)
            .replace(/skunkyskunkydivision/g, playerDivision);

        let events;
        try {
            events = JSON.parse(modifiedData);
        } catch (parseErr) {
            log.error("Error parsing JSON:", parseErr);
            res.status(500).send('Error parsing JSON!!!');
            return;
        }

        log.arena(username + " sent an arena JSON request!");
        res.json(events);
    });
});

app.get("/api/v1/players/Fortnite/tokens", async (req, res) => {
    res.json({});
});

app.get("/api/v1/leaderboards/Fortnite/:eventId/:eventWindowId/:accountId", async (req, res) => {
    try {
        const { eventId, eventWindowId, accountId } = req.params;

        // Build leaderboard from arena_hype in profiles collection
        const profiles = await Profile.find({
            "profiles.athena.stats.attributes.arena_hype": { $gt: 0 }
        }).lean();

        const entries = profiles
            .map(p => ({
                accountId: p.accountId,
                hype: p.profiles?.athena?.stats?.attributes?.arena_hype || 0
            }))
            .sort((a, b) => b.hype - a.hype)
            .map((p, i) => ({
                eventId,
                eventWindowId,
                gameId: "Fortnite",
                percentile: 0,
                pointBreakdown: {
                    "PLACEMENT_STAT_INDEX:0": { pointsEarned: p.hype, timesAchieved: 1 }
                },
                pointsEarned: p.hype,
                rank: i + 1,
                score: p.hype,
                scoreKey: { _scoreId: null, eventId, eventWindowId, gameId: "Fortnite" },
                sessionHistory: [],
                teamAccountIds: [p.accountId],
                teamId: p.accountId,
                unscoredSessions: {},
            }));

        return res.json({
            entries,
            eventId,
            eventWindowId,
            gameId: "Fortnite",
            page: 0,
            totalPages: 1,
            updatedTime: new Date().toISOString(),
        });
    } catch (error) {
        console.error(`Error in leaderboard endpoint:`, error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/events/Fortnite/data/", async (req, res) => {
    res.json({});
});

app.get("/api/v1/events/Fortnite/:eventId/:eventWindowId/history/:accountId", async (req, res) => {
    res.json({});
});

app.get("/api/v1/events/Fortnite/:eventId/history/:accountId", async (req, res) => {
    try {
        const history = JSON.parse(
            fs.readFileSync(path.join(__dirname, "../data/events/history.json"), {
                encoding: "utf8",
            })
        );

        history[0].scoreKey.eventId = req.params.eventId;
        history[0].teamId = req.params.accountId;
        history[0].teamAccountIds.push(req.params.accountId);

        const user = await User.findOne({ accountId: req.params.accountId });
        if (!user) {
            console.error(`User not found for accountId: ${req.params.accountId}`);
            return res.status(404).json({ error: "User not found" });
        }

        const tournamentDetails = user.tournamentDetails || {
            kills: 0,
            placement: 0,
            points: 0,
            wins: 0,
            matchesPlayed: 0,
            matches: [],
        };

        const dedicatedPlayer = {
            TeamId: user.username || "Unknown",
            TeamAccountId: user.accountId,
            PointsEarned: tournamentDetails.points,
            SessionHistory: user.username ? `${user.username}sessionId` : "unknownSessionId",
        };

        const eventId = "Aerislg_cup";
        const windowId = "Aerislg_cup1";
        const rank = 5;
        const percentile = 0;
        const pointBreakdown = {
            eliminations: tournamentDetails.kills,
            placements: tournamentDetails.placement,
        };

        const response = [
            {
                scoreKey: {
                    gameId: "Fortnite",
                    eventId,
                    eventWindowId: windowId,
                    _scoreId: null,
                },
                teamId: dedicatedPlayer.TeamId,
                teamAccountIds: Array.isArray(dedicatedPlayer.TeamAccountId)
                    ? dedicatedPlayer.TeamAccountId
                    : [dedicatedPlayer.TeamAccountId],
                liveSessionId: null,
                pointsEarned: dedicatedPlayer.PointsEarned,
                eventWindowId: windowId,
                score: dedicatedPlayer.PointsEarned,
                gameId: "Fortnite",
                eventId,
                rank: rank,
                percentile: Math.round(percentile),
                pointBreakdown: pointBreakdown,
                sessionHistory: dedicatedPlayer.SessionHistory,
                unscoredSessions: [],
            },
        ];

        return res.json(response);
    } catch (error) {
        console.error(`Error in /api/v1/events/Fortnite/:eventId/history/:accountId:`, error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/events/Fortnite/:windowId/history/:accountId", async (req, res) => {
    res.json({});
});

app.get("/api/v1/players/Fortnite/:accountId", async (req, res) => {
    res.json({
        "result": true,
        "region": "EU",
        "lang": "en",
        "season": process.env.MAIN_SEASON,
        "events": []
    });
});

export default app;
