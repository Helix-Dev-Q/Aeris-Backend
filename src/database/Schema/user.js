import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    created: { type: Date, required: true },
    banned: { type: Boolean, default: false },
    discordId: { type: String, required: true, unique: true },
    accountId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    username_lower: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String, default: '' },
    mfa: { type: Boolean, default: false },
    role: { type: String, default: "user" }, // user | developer | co-owner | owner
    canCreateCodes: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    played: { type: Boolean, default: false },
    tournamentHype: { type: Number, default: 0 },
    tournamentDetails: {
      type: {
        kills: { type: Number, default: 0 },
        placement: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        matchesPlayed: { type: Number, default: 0 },
        matches: {
          type: [
            {
              placement: { type: Number, required: true },
              placementPoints: { type: Number, required: true },
              kills: { type: Number, required: true },
              killPoints: { type: Number, required: true },
              timeAlive: { type: Number, required: true },
              victory: { type: Number, required: true },
            },
          ],
          default: [],
        },
      },
      default: {
        kills: 0,
        placement: 0,
        points: 0,
        wins: 0,
        matchesPlayed: 0,
        matches: [],
      },
      required: false,
    },
    securityEvents: {
      type: [
        {
          type: { type: String, required: true }, // dll_injection, dll_injection_simulated, etc.
          timestamp: { type: Date, required: true },
          processName: { type: String },
          injectedDlls: { type: [String] },
          action: { type: String, required: true }, // temporary_ban, permanent_ban, warning
        },
      ],
      default: [],
    },
  },
  {
    collection: "users",
  }
);

const model = mongoose.model("UserSchema", UserSchema);
export default model;