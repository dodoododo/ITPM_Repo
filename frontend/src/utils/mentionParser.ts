/**
 * Mention Parser Utility
 * Handles parsing, formatting, and rendering of @mentions in comments
 */

import type { User } from '@/types';

interface MentionMatch {
  id: string;
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract all mentions from text
 * Matches pattern: @username_with_underscores or @UsernameWithSpaces
 */
export const extractMentions = (text: string): MentionMatch[] => {
  const mentionRegex = /@([\p{L}\p{N}_.@-]+)/gu;
  const mentions: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      id: '',
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
};

/**
 * Parse mention text to extract user name
 * Converts @John_Doe -> John Doe
 */
export const parseMentionText = (mentionText: string): string => {
  return mentionText
    .replace(/@/, '') // Remove @
    .replace(/_/g, ' ') // Replace underscores with spaces
    .trim();
};

/**
 * Format user name for mention
 * Converts "John Doe" -> @John_Doe
 */
export const formatMentionUser = (user: User): string => {
  return `@${user.full_name.replace(/\s+/g, '_')}`;
};

/**
 * Render comment text with mention highlights
 * Returns HTML with highlighted @mentions
 */
export const renderMentionText = (
  text: string,
  mentionedUsers: Array<string | User> = []
): string => {
  const userMap = new Map<string, User>();
  mentionedUsers.forEach((user) => {
    if (typeof user === 'object') {
      userMap.set(user.full_name.toLowerCase(), user);
      userMap.set(user.email.toLowerCase(), user);
    }
  });

  let result = text;
  const mentions = extractMentions(text);

  // Sort mentions in reverse order to maintain correct indices during replacement
  mentions.sort((a, b) => b.startIndex - a.startIndex);

  mentions.forEach((mention) => {
    const mentionName = parseMentionText(mention.username);
    const isKnown = mentionedUsers.some((user) => {
      if (typeof user === 'object') {
        return (
          user.full_name.toLowerCase() === mentionName.toLowerCase()
          || user.email.toLowerCase() === mention.username.toLowerCase()
        );
      }
      return user.toLowerCase() === mention.username.toLowerCase();
    });

    if (isKnown) {
      const before = result.substring(0, mention.startIndex);
      const mentionPart = result.substring(mention.startIndex, mention.endIndex);
      const after = result.substring(mention.endIndex);
      result = `${before}<span class="mention-highlight bg-yellow-100 font-semibold text-amber-900 px-1 rounded">${mentionPart}</span>${after}`;
    }
  });

  return result;
};

/**
 * Check if text contains valid mentions
 */
export const hasMentions = (text: string): boolean => {
  return /@[\p{L}\p{N}_.@-]+/u.test(text);
};

/**
 * Get mention suggestions based on partial input
 */
export const getMentionSuggestions = (
  query: string,
  users: User[]
): User[] => {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  return users.filter((user) => (
    user.full_name.toLowerCase().includes(lowerQuery)
    || user.email.toLowerCase().includes(lowerQuery)
  ));
};

/**
 * Normalize mention text for comparison
 * Removes special characters and converts to lowercase
 */
export const normalizeMentionKey = (value: string): string => (
  value.toLowerCase().replace(/[^a-z0-9]/g, '')
);
