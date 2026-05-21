/**
 * Backend Mention Utilities
 * Handles mention extraction and notification creation for comments
 */

const { User } = require("../models");

/**
 * Normalize mention key for matching
 * Removes special characters and converts to lowercase
 */
const normalizeMentionKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Extract mentioned users from comment text
 * Matches patterns: @username, @email, @User_Full_Name
 */
const extractMentionedUsers = async (text) => {
  if (!text || typeof text !== "string") return [];

  // Extract all potential mentions (everything after @)
  const tokens = [...new Set((text.match(/@([\p{L}\p{N}_.@-]+)/gu) || []).map((item) => item.slice(1)))];
  if (tokens.length === 0) return [];

  // Get all users and find matches
  const users = await User.find().select("_id full_name email").lean();
  const tokenSet = new Set(tokens.map(normalizeMentionKey));

  return users.filter((user) => (
    tokenSet.has(user._id.toString().toLowerCase())
    || tokenSet.has(normalizeMentionKey(user.email || ""))
    || tokenSet.has(normalizeMentionKey(user.full_name || ""))
  ));
};

/**
 * Extract mentioned user IDs from comment text (more efficient for DB updates)
 */
const extractMentionedUserIds = async (text) => {
  const mentionedUsers = await extractMentionedUsers(text);
  return mentionedUsers.map((user) => user._id);
};

/**
 * Format mention text to display name
 * Converts @John_Doe -> John Doe
 */
const formatMentionText = (mentionText) => {
  return mentionText
    .replace(/@/, "") // Remove @
    .replace(/_/g, " ") // Replace underscores with spaces
    .trim();
};

/**
 * Create notification payload for mentioned users
 */
const createMentionNotificationPayload = ({
  mentionedUsers,
  senderId,
  text,
  taskId,
  projectId,
}) => {
  return mentionedUsers
    .filter((user) => user._id.toString() !== senderId)
    .map((user) => ({
      recipient_id: user._id,
      sender_id: senderId,
      type: "mention",
      title: `Được nhắc đến trong task`,
      body: text.slice(0, 180),
      link_to: `/projects/${projectId}?task=${taskId}`,
      is_read: false,
    }));
};

/**
 * Validate mention format
 */
const isValidMention = (text) => {
  return /@[\p{L}\p{N}_.@-]+/u.test(text);
};

/**
 * Extract all mentions from text (returns raw mention strings)
 */
const extractRawMentions = (text) => {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/@([\p{L}\p{N}_.@-]+)/gu);
  return matches ? matches.map((m) => m.slice(1)) : [];
};

module.exports = {
  normalizeMentionKey,
  extractMentionedUsers,
  extractMentionedUserIds,
  formatMentionText,
  createMentionNotificationPayload,
  isValidMention,
  extractRawMentions,
};
